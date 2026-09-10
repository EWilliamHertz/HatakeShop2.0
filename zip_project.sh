#!/bin/bash
zip -r hatake-shop.zip . -x "node_modules/*" -x ".git/*" -x "dist/*" -x ".env"
echo "Project zipped to hatake-shop.zip"
