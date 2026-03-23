# Supabase Keep-Alive Scripts

This directory contains scripts to keep your Supabase project active and prevent it from entering "Deep Sleep" mode due to inactivity.

## Overview

Supabase free tier projects may enter a sleep state after 7 days of inactivity. These scripts send periodic "ping" requests to keep your project active.

## Files

| File | Description |
|------|-------------|
| `ping-supabase.js` | Main Node.js script that sends ping requests |
| `ping-supabase.ps1` | PowerShell wrapper with logging (Windows) |
| `ping-supabase.bat` | Batch file for easy double-click execution (Windows) |
| `setup-scheduled-task.ps1` | Script to set up Windows Task Scheduler |

## Quick Start

### Option 1: Manual Run (Test)

Double-click `ping-supabase.bat` or run:

```bash
node scripts/ping-supabase.js
```

### Option 2: Windows Task Scheduler (Recommended for Local)

Run PowerShell as Administrator:

```powershell
.\scripts\setup-scheduled-task.ps1
```

This creates a scheduled task that runs every 6 hours.

### Option 3: GitHub Actions (Recommended for Cloud)

Works even when your computer is off!

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
3. The workflow (`.github/workflows/supabase-keep-alive.yml`) will run automatically every 6 hours

## Setup Details

### Prerequisites

- Node.js 18+ installed
- `.env.local` file with Supabase credentials:
  ```
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```

### Windows Task Scheduler Setup

#### Automatic Setup (Requires Admin)

```powershell
# Run as Administrator
.\scripts\setup-scheduled-task.ps1

# Custom interval (every 4 hours)
.\scripts\setup-scheduled-task.ps1 -IntervalHours 4

# Remove the task
.\scripts\setup-scheduled-task.ps1 -Remove
```

#### Manual Setup

1. Open **Task Scheduler** (search in Start menu)
2. Click **Create Basic Task**
3. Name: `SupabaseKeepAlive`
4. Trigger: **Daily**, repeat every **6 hours**
5. Action: **Start a program**
6. Program: `cmd.exe`
7. Arguments: `/c "C:\path\to\your\project\scripts\ping-supabase.bat" --no-pause`

### GitHub Actions Setup

1. Push the `.github/workflows/supabase-keep-alive.yml` file to your repository
2. Add repository secrets:
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY`
3. The workflow runs automatically every 6 hours
4. You can also trigger it manually: Actions → Supabase Keep-Alive → Run workflow

## Configuration

### Changing the Ping Interval

#### Windows Task Scheduler
```powershell
# Change to every 4 hours
.\scripts\setup-scheduled-task.ps1 -IntervalHours 4
```

#### GitHub Actions
Edit `.github/workflows/supabase-keep-alive.yml`:
```yaml
schedule:
  - cron: '0 */4 * * *'  # Every 4 hours
```

Common cron patterns:
- `0 */6 * * *` - Every 6 hours
- `0 */4 * * *` - Every 4 hours
- `0 */2 * * *` - Every 2 hours
- `0 */1 * * *` - Every hour
- `*/30 * * * *` - Every 30 minutes

## Logs

Logs are stored in `logs/supabase-ping.log` (created automatically).

View recent logs:
```bash
# Windows
type logs\supabase-ping.log

# Linux/Mac
cat logs/supabase-ping.log
```

## Troubleshooting

### "Node.js is not installed"
Install Node.js from https://nodejs.org/

### "Missing Supabase configuration"
Ensure `.env.local` exists in the project root with:
```
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
```

### Task Scheduler not running
1. Check Task Scheduler → Task Scheduler Library
2. Find "SupabaseKeepAlive" task
3. Right-click → Run to test
4. Check History tab for errors

### GitHub Actions failing
1. Check Actions tab for error logs
2. Verify secrets are set correctly
3. Ensure `package.json` has `dotenv` dependency

## How It Works

1. The script reads Supabase credentials from `.env.local`
2. Makes a lightweight GET request to `/rest/v1/` endpoint
3. Logs the result to console and file
4. Exits with code 0 on success, 1 on failure

The ping is minimal and doesn't consume database resources - it just hits the REST API root endpoint.

## Security Notes

- Never commit `.env.local` to version control
- The anon key is safe to use in client-side code
- GitHub secrets are encrypted and only exposed to Actions
- The scheduled task runs with limited permissions

## Support

For issues or questions, check:
- Supabase docs: https://supabase.com/docs
- GitHub Actions docs: https://docs.github.com/en/actions