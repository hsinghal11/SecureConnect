# Hosting Node.js + Local PostgreSQL on AWS Free Tier

## 1. The Main Question: Is this a good idea?

**Yes, absolutely.**

Your current issue (server taking too much time connecting to a remote Postgres URL) is likely due to **network latency**. Every time your backend queries the database, the request has to travel across the internet, be processed, and travel back.

**Hosting Postgres "locally" (on the same machine as your backend) eliminates this network travel time entirely.** Your backend connects to `localhost`, making queries almost instantaneous (microsecond latency vs millisecond latency).

### Pros vs Cons on Free Tier (t2.micro / t3.micro)

| Feature | Local Postgres on EC2 (Your Plan) | Remote Managed DB (e.g., Neon/RDS) |
| :--- | :--- | :--- |
| **Speed (Latency)** | ⚡ **Extremely Fast** (0-1ms) | 🐢 **Slower** (30-100ms+) |
| **Cost** | 💰 **Free** (Included in EC2) | 💸 **Free/Paid** (Depends on provider) |
| **Resources (RAM)** | ⚠️ **Heavy** (DB eats RAM) | ✅ **Offloaded** (Run on their servers) |
| **Management** | 🔧 **Manual** (Updates, Backups) | ✨ **Automated** (Backups, Scaling) |

**Verdict:** For a personal project or MVP, hosting everything on one EC2 instance is a **great way to save money and maximize speed**. Just be careful with RAM usage; if your app gets very popular, you might need to upgrade the instance type.

---

## 2. Decision: Local Native vs. Docker Container

You asked which is better. Here is the breakdown for an AWS **t2.micro** (which has only 1GB of RAM).

| Feature | Option A: Native Install (`apt install`) | Option B: Docker Container |
| :--- | :--- | :--- |
| **RAM Usage** | 🟢 **Minimal** (No extra overhead) | 🟡 **Higher** (Docker daemon needs RAM) |
| **Setup** | 🟢 **Simple** (Standard Linux commands) | 🟡 **Medium** (Need to learn Docker/Volumes) |
| **Maintenance** | 🔴 **Messy** (Hard to uninstall cleanly) | 🟢 **Clean** (Delete container = gone) |
| **Persistence** | 🟢 **Automatic** (Data lives on disk) | ⚠️ **Manual** (Must map volumes or data is lost on restart) |

### **Recommendation: Use Option A (Native Install)**
For a **Free Tier t2.micro**, I strongly recommend **Native Install**.
*   **Why?** The t2.micro instance has very limited memory. Docker adds a small layer of overhead. Running Postgres directly on the OS saves those precious megabytes of RAM for your actual application.
*   **Simplicity:** You don't have to deal with Docker networking or volume mapping. It just works.

*(However, I have included instructions for both below so you can choose.)*

---

## 3. Complete Guide: Hosting on AWS EC2

### Step 1: Launch an EC2 Instance
1.  Log in to the [AWS Console](https://console.aws.amazon.com/).
2.  Go to **EC2** Dashboard and click **Launch Instance**.
3.  **Name:** `MySecureConnectServer` (or whatever you like).
4.  **AMI:** Choose **Ubuntu Server 24.04 LTS** (Free Tier Eligible).
5.  **Instance Type:** Choose **t2.micro** or **t3.micro** (Free Tier Eligible).
6.  **Key Pair:** Create a new key pair (e.g., `myserver-key.pem`). **Download and keep this safe!**
7.  **Network Settings (Security Group):**
    *   Allow SSH traffic from **My IP**.
    *   Allow HTTP traffic from the internet.
    *   Allow HTTPS traffic from the internet.
    *   (Optional) Custom TCP Rule: Port `3000` (or your app port) from Anywhere (`0.0.0.0/0`) if you want to test without Nginx first.
8.  **Storage:** The default 8GB is fine, but you can increase it to **30GB** for free.
9.  Click **Launch Instance**.

### Step 2: Connect to Your Instance
Open your terminal (or Putty on Windows if not using WSL/PowerShell):
```bash
# Fix permissions (on Linux/Mac/WSL)
chmod 400 myserver-key.pem

# Connect (replace 1.2.3.4 with your EC2 Public IP)
ssh -i "myserver-key.pem" ubuntu@1.2.3.4
```

### Step 3: Updates & Pre-requisites
It is always good practice to update the package list before installing anything.
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 4: Install Node.js
We will install Node.js (assuming v20 based on your project):
```bash
# Download and install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v
npm -v
```

---

### Step 5: Install PostgreSQL (Choose ONE Method)

#### **Option A: Native Install (Recommended for t2.micro)**

1.  **Install & Start:**
    ```bash
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    ```

2.  **Configure User & DB:**
    ```bash
    # Switch to postgres user
    sudo -i -u postgres
    
    # Enter shell
    psql
    
    # --- SQL COMMANDS ---
    CREATE DATABASE secureconnect_db;
    CREATE USER myuser WITH ENCRYPTED PASSWORD 'mypassword123';
    GRANT ALL PRIVILEGES ON DATABASE secureconnect_db TO myuser;
    \q
    # --------------------
    
    # Exit user
    exit
    ```

#### **Option B: Docker Install (Alternative)**

1.  **Install Docker:**
    ```bash
    sudo apt install -y docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
    # Add ubuntu user to docker group (avoid sudo for docker commands)
    sudo usermod -aG docker ubuntu
    # You must logout and login again for this to take effect!
    exit
    ssh -i "myserver-key.pem" ubuntu@1.2.3.4
    ```

2.  **Run Postgres Container:**
    ```bash
    # Run container with volume mapping for persistence
    docker run -d \
      --name my-postgres \
      -e POSTGRES_USER=myuser \
      -e POSTGRES_PASSWORD=mypassword123 \
      -e POSTGRES_DB=secureconnect_db \
      -p 5432:5432 \
      -v postgres-data:/var/lib/postgresql/data \
      postgres:15
    ```

---

### Step 6: Deploy Your Code
You can clone from GitHub or copy files manually.

**Option A: Clone from GitHub (Recommended)**
```bash
# Clone the repository
git clone https://github.com/hsinghal11/SecureConnect.git

# Enter the project directory
cd SecureConnect
```

**Option B: Upload Files (SCP)**
If code isn't on GitHub, upload it from your local machine:
```bash
# Run this on YOUR computer, not the server
scp -i "myserver-key.pem" -r ./SecureConnect ubuntu@1.2.3.4:/home/ubuntu/
```

### Step 7: Configure Application
1.  **Install Dependencies:**
    ```bash
    cd server
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env` file for your production secrets:
    ```bash
    nano .env
    ```
    Paste your variables. **Crucially, update the Database URL to use localhost:**
    ```env
    # CHANGE THIS to localhost pointing to the user/db you created in Step 5
    DATABASE_URL="postgresql://myuser:mypassword123@localhost:5432/secureconnect_db?schema=public"
    PORT=3000
    # ... other keys ...
    ```
    Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

3.  **Build & Migrate:**
    ```bash
    # Build TypeScript
    npm run build

    # Run Prisma Migrations (this sets up the DB tables on the new local DB)
    npx prisma migrate deploy
    ```

### Step 8: Run with PM2 (Process Manager)
PM2 keeps your app running in the background and restarts it on crashes/reboots.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the app
pm2 start dist/index.js --name "secure-connect-api"

# Save the process list so it restarts on reboot
pm2 save
pm2 startup
# (Copy/paste the command output by pm2 startup)
```

Now your server is running locally on port 3000!

### Step 9: (Recommended) Set up Nginx Reverse Proxy
To access it via `http://your-ip` (port 80) instead of `http://your-ip:3000`, use Nginx.

1.  **Install Nginx:**
    ```bash
    sudo apt install -y nginx
    ```

2.  **Edit Config:**
    ```bash
    sudo nano /etc/nginx/sites-available/default
    ```

3.  **Replace** the `location /` block with:
    ```nginx
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    ```

4.  **Restart Nginx:**
    ```bash
    sudo systemctl restart nginx
    ```

## Final Check
-   [ ] **Database**: Accessible locally via `psql` or the app.
-   [ ] **App**: Running with `pm2 status`.
-   [ ] **Firewall**: Security Group allows connection on Port 80 (HTTP).

You are now hosting your own full-stack app with a local database on AWS Free Tier! 🚀
