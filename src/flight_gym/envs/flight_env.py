import collections
from cStringIO import StringIO
import logging
from enum import IntEnum
from PIL import Image

import gym
from gym import error, spaces, utils
from gym.utils import seeding
import numpy as np

from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys


logger = logging.getLogger(__name__)


HEIGHT = 568
WIDTH = 320
CHANNELS = 3


class MouseAction(IntEnum):
    NO_OP = 0
    CLICK = 1
    DRAG = 2
    SCROLL_UP = 3
    SCROLL_DOWN = 4


# Possible keys that an agent can press.
keys = ("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
       "1234567890!@#$%^&*()`~-_=+[]\{}|;':\"<>?,./")
mapping = collections.OrderedDict()
mapping["NO_OP"] = 0
for i in xrange(1, len(keys) + 1):
    mapping[keys[i - 1]] = i
special = ["DELETE",
           "RETURN",
           "ENTER",
           "ARROW_UP",
           "ARROW_DOWN",
           "ARROW_LEFT",
           "ARROW_RIGHT",
           "CAPS_LOCK",
           "TAB",
           "SPACE",
           "HOME",
           "END",
           "COPY",                           # command+c
           "PASTE",                          # command+v
           "SELECT_ALL",                     # command+a
           "CUT",                            # command+x
           "SELECT_UNTIL_END_OF_LINE",       # command+shift+down
           "SELECT_UNTIL_BEGINNING_OF_LINE", # command+shift+up
           "MOVE_CURSOR_TO_START",           # command+home
           "MOVE_CURSOR_TO_END",             # command+end
]
i = len(keys) + 1
for s in special:
    mapping[s] = i
    i += 1
Keyboard = IntEnum('Keyboard', mapping)


class DOMElementType(IntEnum):
    TEXT = 0 # Simple text on the screen.

    # TODO: In the future it might be useful aid the agent with
    # some other standard DOM types here, such as BUTTON, LINK,
    # INPUT_FIELD, INPUT_AREA, etc.


class FlightEnv(gym.Env):
    # TODO: Actually support "human" and "rgb" mode.
    metadata = {'render.modes': ["human"]}

    def __init__(self):
        self.observation_space = spaces.Dict({
            # Raw screen pixels observed in the web browser.
            "screen_pixels": spaces.Box(low=0, high=255, shape=(HEIGHT, WIDTH, CHANNELS)),

            # List of flattened DOM elements, annotated with their coordinates on screen
            # (x, y, w, h). Each entry also has an element type (DOMElementType), as well
            # as the actual unicode string text.
            "dom": [spaces.Dict({
                "x": spaces.Discrete(WIDTH),
                "y": spaces.Discrete(HEIGHT),
                "w": spaces.Discrete(WIDTH),
                "h": spaces.Discrete(HEIGHT),
                "type": spaces.Discrete(len(DOMElementType)),
                "text": unicode(),
            })],
        })

        # Agent can move the cursor, take a mouse action, press the keyboard, or do nothing.
        self.action_space = spaces.Dict({
            # The position of the mouse cursor position. First value is x position, second
            # is y position. Note that 0 is reserved as a no-op.
            "mouse_cursor_pos": spaces.MultiDiscrete([[0, WIDTH + 1], [0, HEIGHT + 1]]),
            "mouse_action": spaces.Discrete(len(MouseAction)),

            # List of keys in the order they will be pressed, or empty array if nothing
            # is to be pressed.
            "key_action": [spaces.Discrete(len(Keyboard))],
        })
        self.reward_range = (-1.0, 1.0)

        self._initialized = False
        self._seed()

    def _seed(self, seed=None):
        self.np_random, seed = seeding.np_random(seed)
        return [seed]

    def _reset(self):
        if not self._initialized:
            self._driver = webdriver.Chrome()
            self._driver.get("http://127.0.0.1:8000/src/web")
            self._body = self._driver.find_element_by_tag_name("body")
            self._reset_button = self._driver.find_element_by_id("reset")
        else:
            ActionChains(self._driver).move_to_element(self._reset_button).click().perform()
        self._initialized = True

        return self._get_observation()

    def _step(self, action):
        assert self._initialized

        if action is None:
            action = {
                "mouse_cursor_pos": [0, 0], # 0 is no-op
                "mouse_action": MouseAction.NO_OP,
                "key_action": [],
            }

        observation = None
        reward = None
        done = False
        info = None

        action_chain = ActionChains(self._driver)
        if action["mouse_cursor_pos"] != [0, 0]:
            action_chain = self._move_mouse_cursor(action, action_chain)

        if action["mouse_action"] != MouseAction.NO_OP:
            action_chain = self._take_mouse_action(action, action_chain)

        # TODO: Handle keys.

        action_chain.perform()

        observation = self._get_observation()
        return (observation, reward, done, info)

    def _render(self, mode='human', close=False):
        # TODO
        assert self._initialized

    def _get_observation(self):
        observation = {
            "screen_pixels": self._screenshot(),
            # TODO: Derive DOM as well.
            "dom": [
                {
                    "x": "10",
                    "y": "10",
                    "w": "30",
                    "h": "30",
                    "type": DOMElementType.TEXT,
                    "text": "Hello World!",
                }
            ],
        }
        return observation

    def _screenshot(self):
        img = Image.open(StringIO(self._driver.get_screenshot_as_png()))
        # It appears a screenshot on a retina screen is 2x the pixels; there doesn't
        # seem to be a way to detect this.
        # TODO: If we run this headless on Ubuntu double-check this logic to ensure
        # we don't have improperly cropped images due to non-retina screens.
        img = img.crop((0, 0, WIDTH*2, HEIGHT*2))
        img = np.asarray(img, dtype="int32")
        return img

    def _move_mouse_cursor(self, action, action_chain):
        xoffset = action["mouse_cursor_pos"][0] - 1
        yoffset = action["mouse_cursor_pos"][1] - 1
        action_chain.move_to_element_with_offset(self._body, xoffset, yoffset)
        return action_chain

    def _take_mouse_action(self, action, action_chain):
        if action["mouse_action"] == MouseAction.CLICK:
            action_chain.click()
        elif action["mouse_action"] == MouseAction.DRAG:
            # TODO
            pass
        elif action["mouse_action"] == MouseAction.SCROLL_UP:
            # TODO
            pass
        elif action["mouse_action"] == MouseAction.SCROLL_DOWN:
            # TODO
            pass

        return action_chain
