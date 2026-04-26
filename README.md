# Jonty's Bench Quest

A pilgrimage tracker for visiting every Homeless Jesus statue worldwide,
by sculptor Timothy Schmalz. There are 100+ around the world.

## Deploying to GitHub Pages (free, no credits)

### Step 1: Push to GitHub

Push this folder to a new GitHub repository. The repo name can be anything,
e.g. `jonty-bench-quest`.

### Step 2: Enable GitHub Pages via Actions

1. In your repo, go to **Settings > Pages**.
2. Under "Source", select **GitHub Actions**.
3. That's it. The `.github/workflows/deploy.yml` file handles the rest.

Every time you push to `main`, the site will rebuild and deploy automatically.
Your site URL will be: `https://<your-username>.github.io/<repo-name>/`

---

## Enabling Photo Uploads (Cloudinary, free tier)

Photos are hosted on Cloudinary. The free tier (25 GB storage, 25 GB bandwidth)
is more than enough.

### Step 1: Create a Cloudinary account

Sign up at [cloudinary.com](https://cloudinary.com). No credit card required.

### Step 2: Create an unsigned upload preset

1. Dashboard > Settings > Upload.
2. Scroll to "Upload presets" > "Add upload preset".
3. Set "Signing mode" to **Unsigned**.
4. Name it e.g. `jonty_bench_quest`. Save.

### Step 3: Add secrets to GitHub

1. In your repo, go to **Settings > Secrets and variables > Actions**.
2. Add two repository secrets:

   | Name                             | Value                        |
   |----------------------------------|------------------------------|
   | `VITE_CLOUDINARY_CLOUD_NAME`     | Your cloud name (on Cloudinary dashboard) |
   | `VITE_CLOUDINARY_UPLOAD_PRESET`  | Your preset name, e.g. `jonty_bench_quest` |

3. Update `.github/workflows/deploy.yml` to pass them into the build step:

   ```yaml
   - name: Build
     run: npm run build
     env:
       VITE_CLOUDINARY_CLOUD_NAME: ${{ secrets.VITE_CLOUDINARY_CLOUD_NAME }}
       VITE_CLOUDINARY_UPLOAD_PRESET: ${{ secrets.VITE_CLOUDINARY_UPLOAD_PRESET }}
   ```

4. Push and the next deploy will include photo upload support.

---

## Running locally

```bash
npm install
cp .env.example .env   # fill in Cloudinary values
npm run dev
```

## Adding more locations

Edit `src/locations.js`. Each entry needs: `id`, `name`, `city`, `country`,
`flag`, `continent`, and `mapQ` (the Google Maps search query string).

## Data persistence

Visit data (dates, notes, photo URLs) lives in the browser's `localStorage`.
It persists on the same device and browser. For cross-device sync, consider
adding an export/import JSON feature in future.
