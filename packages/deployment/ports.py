"""Dynamic port allocation engine for model deployment containers.

Tracks allocated ports and verifies host socket availability within
the designated serving range (default 8100–8200).
"""

import socket
from typing import Set


class PortAllocationError(RuntimeError):
    """Raised when no ports are available in the designated range."""
    pass


class PortAllocator:
    """Manages host port allocation for model serving containers."""

    DEFAULT_START_PORT = 8100
    DEFAULT_END_PORT = 8200

    def __init__(
        self,
        start_port: int = DEFAULT_START_PORT,
        end_port: int = DEFAULT_END_PORT,
    ) -> None:
        if start_port >= end_port:
            raise ValueError(f"start_port ({start_port}) must be less than end_port ({end_port})")
        self.start_port = start_port
        self.end_port = end_port
        self._reserved_ports: Set[int] = set()

    def is_port_free_on_host(self, port: int) -> bool:
        """Check if a port is physically free by attempting to bind to it."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                sock.bind(("0.0.0.0", port))
                return True
        except (OSError, socket.error):
            return False

    def is_available(self, port: int, active_db_ports: Set[int] | None = None) -> bool:
        """Check if port is neither reserved in-memory, active in DB, nor occupied on host."""
        if port in self._reserved_ports:
            return False
        if active_db_ports and port in active_db_ports:
            return False
        return self.is_port_free_on_host(port)

    def allocate(
        self,
        requested_port: int | None = None,
        active_db_ports: Set[int] | None = None,
    ) -> int:
        """Allocate a host port.

        If `requested_port` is provided, verifies that it is available.
        Otherwise scans the port range sequentially for the first free port.
        """
        active_ports = active_db_ports or set()

        if requested_port is not None:
            if requested_port < 1024 or requested_port > 65535:
                raise ValueError(f"Invalid port number: {requested_port}")
            if not self.is_available(requested_port, active_ports):
                raise PortAllocationError(f"Requested port {requested_port} is already in use")
            self._reserved_ports.add(requested_port)
            return requested_port

        for port in range(self.start_port, self.end_port + 1):
            if self.is_available(port, active_ports):
                self._reserved_ports.add(port)
                return port

        raise PortAllocationError(
            f"No available ports in range {self.start_port}–{self.end_port}"
        )

    def release(self, port: int) -> None:
        """Release a previously reserved port."""
        self._reserved_ports.discard(port)

    @property
    def reserved_ports(self) -> set[int]:
        """Return a copy of currently reserved ports."""
        return set(self._reserved_ports)
