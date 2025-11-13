# Design Guidelines: Sistema Comercial GRUPO JOPER

## Design Approach
**Enterprise Design System Approach** - Drawing from Material Design and Ant Design principles for data-heavy, productivity-focused applications. This system prioritizes clarity, efficiency, and professional aesthetics suitable for business operations.

## Core Design Principles
1. **Clarity First**: Every element serves a functional purpose
2. **Data Accessibility**: Information hierarchy optimized for quick scanning
3. **Mobile Efficiency**: Salespeople must operate seamlessly in the field
4. **Professional Trust**: Design conveys reliability and enterprise credibility

---

## Typography System

**Font Family**: Inter (via Google Fonts CDN)
- Primary: Inter (400, 500, 600, 700 weights)
- Fallback: system-ui, -apple-system, sans-serif

**Type Scale**:
- Page Headers: text-3xl md:text-4xl font-bold (36-40px)
- Section Headers: text-2xl font-semibold (24px)
- Card/Module Titles: text-lg font-semibold (18px)
- Body Text: text-base (16px)
- Supporting Text: text-sm text-gray-600 (14px)
- Labels/Captions: text-xs uppercase tracking-wide (12px)

---

## Layout System

**Spacing Primitives**: Use Tailwind units **2, 4, 6, 8, 12, 16**
- Component padding: p-4 to p-6
- Section spacing: mb-8, mt-12
- Card gaps: gap-4 to gap-6
- Form field spacing: space-y-4

**Grid Structure**:
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Data tables: Full width with horizontal scroll on mobile
- Forms: Single column on mobile, max-w-2xl centered on desktop

**Container Strategy**:
- Main content: max-w-7xl mx-auto px-4
- Forms/Modals: max-w-2xl
- Full-width tables: w-full with inner padding

---

## Component Library

### Navigation
**Top Navigation Bar**:
- Fixed header with company logo (left)
- Role indicator badge
- User profile dropdown (right)
- Mobile: Hamburger menu with slide-out drawer

**Sidebar Navigation** (Desktop):
- Fixed left sidebar (w-64)
- Icon + label menu items
- Active state with subtle background highlight
- Collapsible on tablet

### Dashboard Cards
- White background with subtle shadow (shadow-sm)
- Rounded corners (rounded-lg)
- Header with icon and title
- Metric display: Large number (text-3xl font-bold) with small label below
- Trend indicator (arrow icons)
- Footer action link

### Data Tables
- Zebra striping (alternate row backgrounds)
- Fixed header on scroll
- Row hover state
- Action column (right-aligned) with icon buttons
- Status badges (pill-shaped, colored backgrounds)
- Pagination at bottom
- Mobile: Card-based view replacing table

### Forms
- Labels above inputs (font-medium text-sm)
- Input fields: border, rounded-md, p-3, focus:ring-2
- Helper text below fields (text-sm text-gray-500)
- Required field indicator (red asterisk)
- Field groups with mb-6 spacing
- Primary action button (right-aligned)
- Secondary/Cancel button (left or adjacent)

### Modals/Dialogs
- Overlay with backdrop blur
- Centered card (max-w-lg to max-w-2xl based on content)
- Header with title and close button
- Scrollable content area
- Fixed footer with action buttons

### Status Badges
- Small pill-shaped (px-3 py-1 rounded-full text-xs font-medium)
- Color-coded by status:
  - Pendiente: Yellow background
  - En Proceso: Blue background
  - Completado: Green background
  - Vencido/Bloqueado: Red background

### Buttons
- Primary: Solid background, medium size (px-6 py-3)
- Secondary: Outlined with border
- Icon buttons: Square (h-10 w-10) with centered icon
- Disabled state: Reduced opacity (opacity-50)

### Icons
**Icon Library**: Heroicons (via CDN)
- Navigation icons: 24x24px
- Action buttons: 20x20px
- Status indicators: 16x16px
Use outline style for inactive, solid for active states

---

## Mobile-Specific Design

### Sales Rep Mobile Interface
- Bottom navigation bar (fixed)
- Large touch targets (min 48px height)
- Swipeable cards for customer lists
- Camera integration button for check-in photos
- GPS status indicator
- Offline mode indicator

### Check-in Flow (Mobile)
1. Large "Iniciar Check-in" button
2. Map view showing customer location
3. Customer info card (expandable sections)
4. Photo upload area (grid preview)
5. Notes textarea
6. "Finalizar Visita" button generates PDF

---

## Key Screens Layout

### Admin Dashboard
- Top metrics row: 4 cards (users, active sessions, system status, recent activity)
- User management table below
- Quick actions sidebar (create user, assign roles, view logs)

### Salesperson Dashboard
- Today's agenda card (check-ins scheduled)
- Pending quotations list
- Active orders tracking
- Quick action: "Nueva Cotización" button

### Credit & Collections Dashboard
- Accounts receivable summary cards
- Overdue invoices table
- Customer credit limits widget
- Upcoming statement dates

### Quotation Form (Mobile & Desktop)
- Customer selector (searchable dropdown)
- Product line items table (add/remove rows)
- Pricing summary panel (sticky on scroll)
- PDF preview button
- Submit for approval button

### Digital Customer File
- Tabbed interface: Información, Cotizaciones, Pedidos, Facturas, Cobranza
- Timeline view showing all interactions
- Document gallery with thumbnails
- Quick stats header

---

## Images
No hero images required. This is an enterprise application focused on data and functionality. Use:
- Company logo in navigation
- User avatars in profile areas
- Document thumbnails in file previews
- Check-in photos in visit records
- Product images in quotations (if applicable)

---

## Accessibility & Polish
- Consistent focus states (ring-2 ring-blue-500)
- High contrast text (gray-900 on white, white on dark backgrounds)
- Loading states: Skeleton screens for tables, spinners for buttons
- Error states: Red border on invalid inputs with error message below
- Success feedback: Toast notifications (top-right corner)