# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk-jammy AS audiveris-build
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
WORKDIR /src
ARG AUDIVERIS_REF=5.4.1
RUN git clone --depth 1 --branch ${AUDIVERIS_REF} https://github.com/Audiveris/audiveris.git .
RUN ./gradlew --no-daemon build -x test

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends \
      tesseract-ocr tesseract-ocr-eng ca-certificates curl \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*
COPY --from=audiveris-build /src/app/build/distributions/*.tar /tmp/audiveris.tar
RUN mkdir -p /opt/audiveris \
    && tar -xf /tmp/audiveris.tar -C /opt/audiveris --strip-components=1 \
    && ln -s /opt/audiveris/bin/Audiveris /usr/local/bin/Audiveris \
    && rm /tmp/audiveris.tar

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps || npm install --omit=dev
COPY tsconfig.json ./
COPY src ./src
COPY worker ./worker

ENV HARMONY_AUDIVERIS_BIN=/usr/local/bin/Audiveris
ENTRYPOINT ["npx", "tsx", "--tsconfig", "tsconfig.json", "worker/index.ts"]
