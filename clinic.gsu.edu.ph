server {
    server_name clinic.gsu.edu.ph;
    root /home/ubuntu/clinic/data/public;
    index index.html;

    location / {
        proxy_pass http://localhost:9098;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 600s;
    }

    client_max_body_size 100M;

}