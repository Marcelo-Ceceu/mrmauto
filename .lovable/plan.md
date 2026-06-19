I will implement a comprehensive set of improvements covering security, SEO, and user experience.

### 1. Security Improvements (RLS)

I will update the Row Level Security (RLS) policies to fix the "Always True" warnings. Public access will be restricted to read-only for published vehicles, while management (insert, update, delete) will be strictly reserved for authenticated staff.

### 2. SEO & Performance

- **Dynamic Meta Tags:** I will update the vehicle detail page to include dynamic titles and descriptions (e.g., "Hyundai HB20 2023 - MRM Automóveis") for better social sharing and search ranking.
- **Image Optimization:** Implement lazy loading for vehicle images to speed up page load times.
- **Canonical Tags:** Add canonical tags to prevent duplicate content issues.

### 3. User Experience (UX)

- **Smart WhatsApp Links:** I will update the "Interest" buttons on the vehicle details page to pre-fill a WhatsApp message with the specific car's details (Model, Year, Price).
- **Social Sharing:** Improve the metadata so when a vehicle link is shared, the car's photo and price appear correctly in the preview.

### Technical Details

- **Database:** Modify RLS policies for `vehicles`, `vehicle_expenses`, `negotiations`, and `installments` tables.
- **Frontend:**
  - Edit `src/routes/estoque.$id.tsx` for dynamic SEO and WhatsApp logic.
  - Edit `src/routes/index.tsx` for image lazy loading.
  - Implement a `SEO` component or utility for managing document head tags.
