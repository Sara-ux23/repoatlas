# Developer Guide

This guide is for developers who want to understand, modify, or extend RepoAtlas AI.

## Architecture Overview

RepoAtlas AI uses a multi-agent architecture where specialized AI agents analyze different aspects of a codebase.

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  - User Interface                                        │
│  - Visualization Components                              │
│  - API Client                                            │
└────────────────┬──────────────────────────