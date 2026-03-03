FROM node:15-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

EXPOSE 3000

ENV PORT 3000

CMD ["npm", "run", "dev"]