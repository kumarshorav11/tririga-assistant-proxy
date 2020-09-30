FROM node:12-alpine
RUN npm install
COPY assistant-proxy.js .
EXPOSE 8080
CMD [ "node", "assistant-proxy.js" ]