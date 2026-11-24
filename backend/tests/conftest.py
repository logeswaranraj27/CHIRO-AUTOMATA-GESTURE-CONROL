import os
import sys
import tempfile
import unittest.mock

# Set writable MPLCONFIGDIR to prevent slow font cache warnings in testing
os.environ.setdefault("MPLCONFIGDIR", os.path.join(tempfile.gettempdir(), "chiro_mpl"))

# Guard against PortAudio / sounddevice initialization crash in headless / sandbox testing
if "sounddevice" not in sys.modules:
    sys.modules["sounddevice"] = unittest.mock.MagicMock()

