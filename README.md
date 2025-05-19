# Yo Chan 👋🦭

A minimal self-hosted image server for processing and storing images. Named after the seal at Tokkari Center who's known for compressing ~~files~~ her neck.

Originally, I wrote this when I bought a very cheap VPS to play with, and wanted something useful to host on it.

## Features

- POST & DELETE methods for images
- Actions are protected by an API key set in .env
- Images can be saved within folders in order to group by purpose
- Basic image processing (conversion to webp/jpg & thumbnailing)

## Why it's neat technically

- Written for Bun runtime, using Elysia
- Elysia means that query params are all typesafe & will return detailed errors
- captain-definition file allows deployment on [CapRover](https://caprover.com/)

## API

| Route        | Method   | Use                         | Expects                                                             |
| ------------ | -------- | --------------------------- | ------------------------------------------------------------------- |
| `/`          | `GET`    | Check the server is running |                                                                     |
| `/`          | `POST`   | Create image                | `body: { file: File }, query: { key, purpose?, ...transformations}` |
| `/`          | `DELETE` | Delete image                | `query: { key, urlPath }`                                           |
| `/uploads/*` | `GET`    | Get image stored at `/*`    | e.g. `/uploads/food/test.jpeg`                                      |
