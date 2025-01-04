# Stop and remove the container
docker stop nginx 1>/dev/null 2>/dev/null 
docker rm nginx 1>/dev/null 2>/dev/null

# Run the container
# mount: ./nginx/static/index.html will be /usr/share/nginx/html/index.html
docker run --name nginx \
       --detach --publish 8080:80 \
       --mount type=bind,src=./nginx/static,dst=/usr/share/nginx/html,ro \
       nginx:1.27.3
