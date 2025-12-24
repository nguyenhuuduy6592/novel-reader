This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Docker Deployment

### Using Docker Compose (Recommended for Local Development)

For development with hot reloading:

```bash
docker-compose --profile dev up -d
```

### Using Docker Directly

For development:

```bash
docker build -f Dockerfile.dev -t novel-reader-dev .
docker run -p 3000:3000 -v $(pwd):/app novel-reader-dev
```

### Docker Configuration

The project includes:
- `Dockerfile.dev` - Development environment with hot reloading using Node.js 22
- `docker-compose.yml` - Orchestration for development environment
- `.dockerignore` - Optimizes build context by excluding unnecessary files

The application will be available at [http://localhost:3000](http://localhost:3000) when running in Docker.

### Node.js Version

This project uses Node.js 22 in Docker to ensure compatibility with Next.js 16.1.0, which requires Node.js version >=20.9.0.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.