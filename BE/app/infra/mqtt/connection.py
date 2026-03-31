import asyncio
import json
import logging
import os

import aiomqtt
from app.core.db.session import SessionLocal
from app.domains.telemetry.service import (
    ingest_message_and_create_job,
    process_inference_job,
)
from app.infra.mqtt.topics import (
    MQTT_SUBSCRIBE_RULES,
    build_control_topic,
    parse_orbit_topic,
)
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MQTT_HOST = os.getenv("MQTT_HOST", os.getenv("MQTT_BROKER", "mosquitto"))
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_USERNAME = os.getenv("MQTT_USERNAME")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD")

PIPELINE_CONCURRENCY = int(os.getenv("PIPELINE_CONCURRENCY", 5))
_pipeline_semaphore = asyncio.Semaphore(PIPELINE_CONCURRENCY)
_background_tasks: set[asyncio.Task] = set()


async def _publish_control_message(
    client: aiomqtt.Client,
    topic: str,
    payload: dict,
) -> None:
    try:
        raw = json.dumps(payload, ensure_ascii=False)
        await client.publish(topic, payload=raw.encode("utf-8"))
        logger.info("[mqtt pub 성공] topic=%s", topic)
    except Exception as e:
        logger.error("[mqtt pub 실패] topic=%s error=%s", topic, e)


async def _run_pipeline_and_publish(
    client: aiomqtt.Client, job_id: int
) -> None:
    async with _pipeline_semaphore:
        result = await process_inference_job(job_id)
        if not result:
            return
        topic, payload = result
        await _publish_control_message(client, topic, payload)


async def run_mqtt_listener() -> None:
    while True:
        try:
            logger.info("[MQTT 연결 시도] %s:%s", MQTT_HOST, MQTT_PORT)

            async with aiomqtt.Client(
                hostname=MQTT_HOST,
                port=MQTT_PORT,
                username=MQTT_USERNAME,
                password=MQTT_PASSWORD,
            ) as client:
                for rule in MQTT_SUBSCRIBE_RULES:
                    await client.subscribe((rule["topic"], rule["qos"]))
                    logger.info(
                        "[MQTT sub] topic=%s qos=%s",
                        rule["topic"],
                        rule["qos"],
                    )

                async for message in client.messages:
                    try:
                        topic = str(message.topic)
                        parsed = parse_orbit_topic(topic)
                        if not parsed:
                            logger.warning(
                                "[MQTT 경고] topic 미지원 | topic=%s", topic
                            )
                            continue

                        payload_str = message.payload.decode("utf-8")
                        payload_json = json.loads(payload_str)

                        payload_device_id = payload_json.get("device_id")
                        if (
                            payload_device_id
                            and payload_device_id != parsed.device_id
                        ):
                            logger.error(
                                "[MQTT 경고] 기기ID 불일치 | topic=%s payload=%s",
                                parsed.device_id,
                                payload_device_id,
                            )
                            continue

                        response_topic = build_control_topic(parsed.device_id)

                        async with SessionLocal() as db:
                            job_id = await ingest_message_and_create_job(
                                db,
                                topic_device_id=parsed.device_id,
                                source_topic=topic,
                                raw_payload=payload_json,
                                response_topic=response_topic,
                            )

                        # status/heartbeat path may not create a job.
                        if not job_id:
                            continue

                        task = asyncio.create_task(
                            _run_pipeline_and_publish(client, job_id)
                        )
                        _background_tasks.add(task)
                        task.add_done_callback(_background_tasks.discard)

                    except json.JSONDecodeError:
                        logger.error(
                            "[MQTT_message_error] invalid JSON payload"
                        )
                    except Exception as e:
                        logger.error("[MQTT_message_error] %s", e)

        except asyncio.CancelledError:
            logger.info("[MQTT_listener_stop] cancellation received")
            for task in list(_background_tasks):
                task.cancel()
            if _background_tasks:
                await asyncio.gather(
                    *_background_tasks, return_exceptions=True
                )
            raise

        except aiomqtt.MqttError as e:
            logger.error("[MQTT_disconnected] retry in 5s: %s", e)
            await asyncio.sleep(5)
        except Exception as e:
            logger.error("[MQTT_error] retry in 5s: %s", e)
            await asyncio.sleep(5)
