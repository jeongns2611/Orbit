import os
from glob import glob
from setuptools import find_packages, setup

package_name = 'lidar_preprocessor'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        (os.path.join('share', package_name, 'launch'), glob('launch/*.py')),
        (os.path.join('share', package_name, 'config'), glob('config/*.yaml')),
        # (os.path.join('share', package_name), ['.env']),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='a304',
    maintainer_email='a304@todo.todo',
    description='TODO: Package description',
    license='TODO: License declaration',
    extras_require={
        'test': [
            'pytest',
        ],
    },
    entry_points={
        'console_scripts': [
            'scan_filter_node = lidar_preprocessor.scan_filter_node:main',
            'cluster_node = lidar_preprocessor.cluster_node:main',
            'mqtt_bridge_node = lidar_preprocessor.mqtt_bridge_node:main',
        ],
    },
)
