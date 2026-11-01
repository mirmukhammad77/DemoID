FROM golang:1.24.8-alpine3.22 AS source
RUN apk add --no-cache git
ENV CGO_ENABLED=0 GOTOOLCHAIN=local

FROM source AS server-build
ARG MINIO_VERSION=RELEASE.2025-10-15T17-29-55Z
RUN git clone --depth 1 --branch "$MINIO_VERSION" https://github.com/minio/minio.git /src
WORKDIR /src
RUN go build -trimpath -ldflags="-s -w" -o /out/minio .

FROM source AS client-build
ARG MC_VERSION=RELEASE.2025-08-13T08-35-41Z
RUN git clone --depth 1 --branch "$MC_VERSION" https://github.com/minio/mc.git /src
WORKDIR /src
RUN go build -trimpath -ldflags="-s -w" -o /out/mc .

FROM alpine:3.22 AS runtime
RUN apk add --no-cache ca-certificates

FROM runtime AS server
COPY --from=server-build /out/minio /usr/local/bin/minio
RUN mkdir /data && chown 10001:10001 /data
USER 10001:10001
EXPOSE 9000 9001
ENTRYPOINT ["minio"]

FROM runtime AS client
COPY --from=client-build /out/mc /usr/local/bin/mc
ENV MC_CONFIG_DIR=/tmp/.mc
USER 10001:10001
ENTRYPOINT ["mc"]
