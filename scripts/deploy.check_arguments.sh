#!/usr/bin/env sh

set -euo

if [ -z "$STACK_NAME" ]; then
  echo "ERROR: environment variable STACK_NAME is required."
  exit 1
fi

if [ -z "$VERSION" ]; then
  echo "ERROR: environment variable VERSION is required."
  exit 1
fi
