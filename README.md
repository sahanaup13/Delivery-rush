# Delivery Rush
Dispatch orders to scooter riders and race a min-heap + BFS + greedy algorithm.

## Run locally
Windows: double-click start.bat (it starts the server and opens the website).
Or by hand:
    python -m http.server 8000
Open http://localhost:8000  (add ?test=1 for browser checks, ?present=1 for big text, ?demo=1 to watch the algorithm play)

## Verify
    node tools/verify-content.mjs

## Deploy
    git init
    git add .
    git commit -m "Delivery Rush"
Create an empty repo on github.com, then:
    git remote add origin https://github.com/YOUR-NAME/delivery-rush.git
    git branch -M main
    git push -u origin main
On vercel.com choose Add New > Project, import the repo, keep the defaults (no build step) and press Deploy.
