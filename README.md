# Watch Project

A modern web application for watch enthusiasts to discover, search, and manage their watch preferences. Built with React, TypeScript, and Supabase.

## Features

- 🔍 Advanced watch search functionality
- 👤 User authentication with Google and email/password
- 📊 Search limit tracking (3 free searches, 17 more after signup)
- 👤 User profiles with customizable preferences
- 🖼️ Profile picture upload and management
- 💰 Price range filtering
- 🎨 Watch style and feature preferences
- 📱 Responsive design

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Styled Components
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Routing**: React Router

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Google Cloud Platform account (for OAuth)

## Getting Started

### 1. Clone the Repository

```bash
git clone [your-repository-url]
cd watch-project
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install webapp dependencies
cd webapp
npm install
```

### 3. Set Up Supabase

1. Create a new Supabase project
2. Set up the following in your Supabase project:
   - Create a `profile-images` bucket in Storage
   - Run the SQL migration for `user_search_counts` table
   - Configure Google OAuth
   - Get your project URL and anon key

### 4. Configure Environment Variables

Create a `.env` file in the `webapp` directory:

```env
VITE_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
```

### 5. Start the Development Server

```bash
cd webapp
npm run dev
```

## Project Structure

```
watch-project/
├── webapp/                 # Frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts
│   │   ├── lib/          # Utility functions and configurations
│   │   ├── pages/        # Page components
│   │   ├── types/        # TypeScript type definitions
│   │   └── assets/       # Static assets
│   ├── public/           # Public assets
│   └── package.json      # Frontend dependencies
├── backend/              # Backend services
├── data pipeline/        # Data processing scripts
└── package.json         # Root dependencies
```

## Authentication Flow

1. **Anonymous Users**:
   - Get 3 free searches
   - Prompted to sign up after limit reached

2. **New Users**:
   - Sign up with Google or email/password
   - Redirected to profile setup
   - Get 17 additional free searches

3. **Existing Users**:
   - Sign in with Google or email/password
   - Access profile and preferences
   - Track remaining searches

## Database Schema

### user_search_counts
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to auth.users)
- `search_count`: INTEGER
- `last_reset_date`: TIMESTAMP
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### watch_preferences
- `user_id`: UUID (Primary Key)
- `name`: TEXT
- `bio`: TEXT
- `profile_image`: TEXT
- `preferred_brands`: TEXT[]
- `price_range_min`: INTEGER
- `price_range_max`: INTEGER
- `preferred_styles`: TEXT[]
- `preferred_features`: TEXT[]
- `preferred_materials`: TEXT[]
- `preferred_complications`: TEXT[]
- `dial_colors`: TEXT[]
- `case_sizes`: TEXT[]

## API Endpoints

### Authentication
- `POST /auth/v1/signup` - User registration
- `POST /auth/v1/signin` - User login
- `POST /auth/v1/signout` - User logout
- `GET /auth/v1/user` - Get current user

### Search
- `POST /api/analyze-query` - Analyze search query
- `GET /api/search` - Search watches

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile
- `POST /api/profile/image` - Upload profile image

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email [your-email] or open an issue in the repository.

## Acknowledgments

- [Supabase](https://supabase.com) for the backend infrastructure
- [React](https://reactjs.org) for the frontend framework
- [TypeScript](https://www.typescriptlang.org) for type safety
- [Styled Components](https://styled-components.com) for styling