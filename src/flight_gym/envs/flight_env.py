import collections
import logging
from enum import IntEnum

import gym
from gym import error, spaces, utils
from gym.utils import seeding
import numpy as np


logger = logging.getLogger(__name__)


HEIGHT = 568
WIDTH = 320
CHANNELS = 3

# TODO: Actually confirm the pixel bit depth; it's probably much larger than whats provided here.
MAX_PIXEL_VALUE = 32767


class MouseAction(IntEnum):
    no_op = 0
    click = 1
    drag = 2
    scroll_up = 3
    scroll_down = 4 


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
            "screen_pixels": spaces.Box(low=0, high=MAX_PIXEL_VALUE,
                                        shape=(HEIGHT, WIDTH, CHANNELS)),

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
            "key_action": spaces.Discrete(len(Keyboard)),
        })
        self.reward_range = (-1.0, 1.0)

        self._seed()

        # TODO: Make selenium connection to browser here.

    def _seed(self, seed=None):
        self.np_random, seed = seeding.np_random(seed)
        return [seed]

    def _step(self, action):
        # TODO: Translate the action into a form the browser can run in Selenium,
        # then get the results back as an observation to return.
        observation = {
            "screen_pixels": np.random.randint(0, high=32767, size=(HEIGHT, WIDTH, CHANNELS)),
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
        reward = 1.0
        done = False
        info = {}
        return (observation, reward, done, info)

    def _reset(self):
        # TODO: Reset the browser environment and return an observation.
        return self._step(action=None)

    def _render(self, mode='human', close=False):
        # TODO
        logger.info("FlightEnv._render")
        pass
