FROM node:18

WORKDIR /app

ENV TZ=Asia/Bangkok

COPY package*.json ./
RUN npm install

COPY . .

# สร้างโฟลเดอร์ uploads และตั้งค่าสิทธิ์
RUN mkdir -p uploads/images && chmod 755 uploads/images

RUN npm run build

CMD ["npm", "run", "dev"]
