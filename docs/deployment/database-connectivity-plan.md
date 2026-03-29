# Database Connectivity Plan

This document is kept only as a historical note.

TrackDraw no longer plans to connect Cloudflare Workers to a home-hosted PostgreSQL instance for share storage. The current direction is Cloudflare D1, which removes the Hyperdrive, Tunnel, and private-network database connectivity layer from the app path.

Use [deployment-setup.md](./deployment-setup.md) for the current deployment and database setup.
