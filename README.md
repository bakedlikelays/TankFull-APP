# TankFull (prototype)

Multi-company app for water haulers. You host one app; each hauling company signs up, sets up its trucks and fill stations, and invites its own drivers and dispatchers. Every company's data is isolated in the database.

Talks to the Supabase project named `tankday` (its original working name; the project name is internal and never shown to users).

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints. `--host` is on, so you can open the "Network" URL on your phone (same Wi-Fi).

## Flows

**New hauling company (owner)**
1. Create an account (Supabase emails a confirmation link by default; to skip while testing: Supabase dashboard → Authentication → Sign In / Providers → Email → turn off "Confirm email").
2. Choose **I run a water hauling company** and enter the company details. You become the owner.
3. Gear icon → **Setup**: add trucks and fill stations. **Team**: create invite codes for drivers (owners can also invite dispatchers) and send them by text.

**Driver or dispatcher**
1. Create an account, choose **I have an invite code**, enter the code.
2. Drivers see today's route, mark stops delivered, and log fills.

**Dispatching (owners and dispatchers)**
- **Customers** tab: add a customer with their property (address, gate code, hose run, dogs, road) and tank (size, daily use, last fill). Open a customer to see their tank estimate, adjust daily use, see recent orders, and create an order.
- **Board** tab, for any date:
  - *Running low*: tanks estimated at 5 days or less with no open order. Text a reminder or create an order in one tap.
  - *Requests*: open orders. Pick a truck and add them to that day's route, or cancel.
  - *Routes*: each truck's stops with total gallons and loads. Reorder (↑ ↓), take a stop off (✕), and assign a driver.
- **My route** tab: the driver view, for owners who also drive.

Drivers only see the driver screens.

**Customer portal (homeowners)**
- In **Customers**, open a customer → **Invite to portal** → **Text invite** (or **Copy link**). The code is good for 30 days and links to that customer only.
- The invite is a join link (`/join/AB12CD34`). Tapping it opens the app on "Create account" with "You're invited to join <company>" shown, and after sign-up they're connected automatically. The code is remembered on that device, so it still works after the email-confirmation step. Typing the code by hand still works too.
- Team invites (drivers, dispatchers) use the same kind of link.

**Hosting note for join links**
- The `/join/...` addresses need the host to send every page to `index.html`. `vercel.json` (Vercel) and `public/_redirects` (Netlify) are included for that.
- In Supabase → Authentication → URL Configuration, set **Site URL** to your live address and add it to **Redirect URLs**, so the confirmation email brings people back to the app.
- The homeowner creates an account, enters the code, and sees their tank gauge, days left, their open delivery, and past deliveries. They can request water (fill up or a set amount, soonest or a date, "I'm out of water"), cancel a request before it's scheduled, and call you.
- Their requests land in **Requests** on the Board. The database blocks ordering more than the tank holds or a second order while one is open.

**Demo**
- Join with code **DEMO2026** to land in "Demo Water Co" as a driver, then tap **Load demo route**. Good for showing haulers the app.

**Directory, leads and referrals**
- *Hauler setup* (Company → Setup, owner only): list "Towns you deliver to", then turn on **TankFull directory** (about line, starting price per 1,000 gal, minimum order, show/hide pricing) and/or **Customer referrals** (credit amount for each person, default $15).
- *Homeowner without an invite:* after sign-up they pick **I need water delivered**, choose their town, see listed haulers that serve it, and **Request service**. If no hauler serves their town, **My town isn't listed** records it for you (see "Unserved demand" below).
- *Referrals:* customers get a **Share my link** card in their portal (`/r/CODE`). A friend who opens it sees "Alice recommends Paulden Water Co" and goes straight to a request form for that hauler. This works even if the hauler isn't listed in the directory.
- *Leads tab* (with a count of new ones): Call / Text (marks it contacted), **Add as customer** (the customer form, prefilled; if the requester already has an account, saving connects their portal automatically), or **Can't take them** (they're told and can pick someone else).
- *Credits:* when a referred customer's **first** delivery is recorded, both people get the credit automatically (never twice). Customers see their balance in the portal; on the customer's page you see the history and tap **Mark as used on bill** when you apply it.
- Requesters see a "Request sent" screen until the hauler adds them, then it becomes their tank and ordering page. One open request at a time; they can withdraw and choose another hauler.

**Unserved demand** — "not in your area yet" sign-ups go to the `area_requests` table. The app never shows it to anyone; read it in Supabase → Table Editor. Use it in hauler pitches ("12 people in Paulden asked for service").

**Live updates**
- The Board, the driver's route and the customer portal refresh on their own when orders, routes or deliveries change (and when the app comes back to the foreground).
- When a driver taps **Start stop**, **Navigate** or **Text ETA**, that order becomes **On the way**: the Board shows it, and the customer sees "Your water is on the way."

**Editing customers**
- Customers → open one → **Edit**: contact, property, access notes and tank. Changing "last filled" resets the tank estimate to full as of that day; saving without touching it leaves the estimate alone.

**Install on a phone**
- The app is installable (home-screen icon, full screen, quick to open on weak signal). It needs to be served over HTTPS, so this works once it's hosted (Vercel/Netlify), not from `npm run dev`.
- iPhone: open it in Safari → Share → **Add to Home Screen**. Android: Chrome shows **Install app** in the menu.
- Only the app's own files are cached. Live data always comes from the network.

## Who can do what (enforced in the database)

| | Owner | Dispatcher | Driver |
|---|---|---|---|
| Edit company details | ✓ | | |
| Add/edit trucks, fill stations, pricing | ✓ | ✓ | read only |
| Invite drivers | ✓ | ✓ | |
| Invite dispatchers | ✓ | | |
| Routes, deliveries, fill logs | ✓ | ✓ | ✓ |

Invite codes are single-use and expire after 14 days. Cancelling one expires it immediately.

## Not built yet

- Automatic text reminders (the "Text reminder" button opens your phone's messages; Twilio comes later)
- Customer portal: invoices/payments, multiple tanks or properties per customer
- Your subscription billing to haulers (Stripe) and haulers' own payouts (Stripe Connect)

## Demo pieces to remove before launch

- Demo Water Co rows, the `DEMO2026` invite, and the `demo_load_today()` function
- The now-inactive `demo_attach_new_user` trigger/function (it does nothing; drop it from the Supabase SQL editor)

## Files

- `src/screens/FindWater.jsx` – directory search, request service, not-in-area form, request status
- `src/screens/Leads.jsx` – hauler's service requests
- `src/screens/CustomerPortal.jsx` – homeowner tank view, order water, delivery history
- `src/screens/Board.jsx` – dispatch board: running low, requests, routes
- `src/screens/Customers.jsx` – customer list, add customer, customer detail, new order
- `src/components/NewOrderForm.jsx`, `src/components/ManagerNav.jsx`
- `src/screens/Onboarding.jsx` – create a company or join with a code
- `src/screens/Company.jsx` – company details, trucks, fill stations, team, invites
- `src/screens/Route.jsx` – today's route, water on truck
- `src/screens/Stop.jsx` – access notes, navigate / text ETA, gallons, photo, mark delivered
- `src/screens/FillLog.jsx` – station, gallons, cost, ticket photo
- `src/supabase.js` – client, Arizona date helper, photo upload (private `photos` bucket)

## Design preview (no database needed)

`.preview/` runs the app against built-in sample data, so you can look at every screen without signing in or touching Supabase:

```bash
npx vite --config .preview/vite.config.js      # then open http://localhost:5199/?as=driver
```

Use `?as=owner`, `driver`, `customer`, `new` (onboarding) or `out` (login). `python3 .preview/shots.py` screenshots every screen into `.preview/shots/` (needs Playwright).
