#!/usr/bin/env python
import logging

import gym
from gym.envs.registration import register

from envs.flight_env import FlightEnv


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

EPISODE_MAX_TIME_S = 30


def main():
    logger.info("main")
    env = gym.make('WoB-Flight-Sandbox-v0')
    logger.info("env={}".format(env))
    for i_episode in xrange(20):
        observation = env.reset()
        for t in range(100):
            env.render()
            logger.info(observation)
            action = env.action_space.sample()
            logging.info("Action sampled: {}".format(action))
            observation, reward, done, info = env.step(action)
            logging.info("Reward: {}, done: {}, info: {}, observation: {}".format(
                reward, done, info, observation))
            if done:
                logger.info("Episode finished after {} timesteps".format(t+1))
                break


if __name__ == "__main__":
    register(
        id='WoB-Flight-Sandbox-v0',
        entry_point='envs.flight_env:FlightEnv',
        max_episode_seconds=EPISODE_MAX_TIME_S
    )
    main()