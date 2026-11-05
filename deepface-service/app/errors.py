class InvalidImage(Exception):
    """A bounded internal image payload could not be decoded safely."""


class WorkerUnavailable(Exception):
    """Initialization, capacity, or inference failed without a usable observation."""
