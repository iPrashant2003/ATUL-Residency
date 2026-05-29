$envVars = @{
    "NEXTAUTH_URL" = "https://atul-residency.vercel.app"
    "NEXTAUTH_SECRET" = "atul-residency-super-secret-jwt-key-2024-change-in-production"
    "AUTH_TRUST_HOST" = "true"
    "WHATSAPP_BOT_URL" = "https://atul-residency.vercel.app"
    "CRON_SECRET" = "set-a-random-secret-here"
    "CLOUDINARY_CLOUD_NAME" = "your-cloud-name"
    "CLOUDINARY_API_KEY" = "your-api-key"
    "CLOUDINARY_API_SECRET" = "your-api-secret"
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME" = "your-cloud-name"
    "WHATSAPP_OWNER_NUMBER" = "6392651108"
    "ADMIN_EMAIL" = "atultiwari123321@gmail.com"
    "ADMIN_EMAIL_2" = "prashantmanitripathi2003@gmail.com"
    "ADMIN_PASSWORD" = "Atul@070923"
    "NEXT_PUBLIC_UPI_ID" = "atultiwari123321@oksbi"
    "NEXT_PUBLIC_UPI_NAME" = "Atul Tiwari"
    "FAST2SMS_API_KEY" = "xytXhivBL0qKeO9Ug5NFzaVI3AW2wuscQoHDCbZ6Mfp7n84STJpFNyXZqvfJIlidS1BWusAYUKneMjVa"
    "SMTP_HOST" = "smtp.gmail.com"
    "SMTP_PORT" = "465"
    "SMTP_USER" = "atultiwari123321@gmail.com"
    "SMTP_PASS" = "jaakmwxoifeszudw"
    "GEMINI_API_KEY" = "AIzaSyA7274CX76ayiW0GrePynaarGT8yxvDfow"
    "DATABASE_URL" = "postgresql://neondb_owner:npg_O8q1BsQLKfno@ep-billowing-star-ajgbsm9e-pooler.c-3.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
    "DATABASE_URL_DIRECT" = "postgresql://neondb_owner:npg_O8q1BsQLKfno@ep-billowing-star-ajgbsm9e.c-3.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY" = "BJULim9UpjvBt_tZRC3yei7P-vK74DpAQBLp4IJBoS9gx7zTjjF6Z2y84KCCdUPLbKGXFKGqMfDRGYgt1jIC9ZQ"
    "VAPID_PRIVATE_KEY" = "sE_2Nk-ojaRRRPZZo-_iMQn9b8f7P4S6UQwuXN9HB4I"
    "VAPID_MAILTO" = "mailto:atultiwari123321@gmail.com"
}

foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    Write-Host "Setting $key..."
    echo "$value" | npx vercel env add $key production
}

Write-Host "Done!"
