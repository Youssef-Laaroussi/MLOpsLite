"""Unit tests for PortAllocator and dynamic port collision handling (Issue #11)."""

import socket
import pytest

from packages.deployment.ports import PortAllocator, PortAllocationError


class TestPortAllocator:
    """Tests for host port allocation, range scanning, and collision prevention."""

    def test_default_initialization(self):
        allocator = PortAllocator()
        assert allocator.start_port == 8100
        assert allocator.end_port == 8200
        assert len(allocator.reserved_ports) == 0

    def test_invalid_range_raises_value_error(self):
        with pytest.raises(ValueError):
            PortAllocator(start_port=8200, end_port=8100)

    def test_allocate_sequential_ports(self):
        allocator = PortAllocator(start_port=9000, end_port=9005)
        p1 = allocator.allocate()
        p2 = allocator.allocate()

        assert p1 == 9000
        assert p2 == 9001
        assert allocator.reserved_ports == {9000, 9001}

    def test_allocate_requested_port(self):
        allocator = PortAllocator(start_port=9000, end_port=9005)
        port = allocator.allocate(requested_port=9003)
        assert port == 9003
        assert 9003 in allocator.reserved_ports

    def test_allocate_already_reserved_port_fails(self):
        allocator = PortAllocator(start_port=9000, end_port=9005)
        allocator.allocate(requested_port=9002)

        with pytest.raises(PortAllocationError):
            allocator.allocate(requested_port=9002)

    def test_allocate_honors_active_db_ports(self):
        allocator = PortAllocator(start_port=9000, end_port=9005)
        # Port 9000 is occupied in DB
        port = allocator.allocate(active_db_ports={9000})
        assert port == 9001

    def test_release_port(self):
        allocator = PortAllocator(start_port=9000, end_port=9005)
        port = allocator.allocate()
        assert port in allocator.reserved_ports

        allocator.release(port)
        assert port not in allocator.reserved_ports

        # Can re-allocate the same port now
        reallocated = allocator.allocate()
        assert reallocated == port

    def test_exhausted_ports_raises_error(self):
        allocator = PortAllocator(start_port=9000, end_port=9001)
        allocator.allocate()  # 9000
        allocator.allocate()  # 9001

        with pytest.raises(PortAllocationError):
            allocator.allocate()

    def test_invalid_requested_port_number(self):
        allocator = PortAllocator(start_port=9000, end_port=9005)
        with pytest.raises(ValueError):
            allocator.allocate(requested_port=80)  # Privileged port < 1024
