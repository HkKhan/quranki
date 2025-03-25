import { prisma } from '@/lib/prisma';
import { Metadata, ResolvingMetadata } from 'next';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Get invited by parameter
  const invitedByEmail = searchParams.invitedBy as string | undefined;
  
  // Default metadata
  let title = "Sign in to Quranki";
  let description = "Sign in to your Quranki account to continue reviewing the Quran.";
  
  // Customize metadata for invitation links
  if (invitedByEmail) {
    // Try to fetch the user's name
    try {
      const user = await prisma.user.findUnique({
        where: { email: invitedByEmail },
        select: { name: true, email: true },
      });
      
      // Use the user's name if available, otherwise use the email
      const inviterName = user?.name || invitedByEmail;
      
      title = `Quranki`;
      description = `Click this link to add ${inviterName} as a friend on Quranki`;
    } catch (error) {
      console.error("Error fetching user for metadata:", error);
      title = `Quranki`;
      description = `Click this link to add ${invitedByEmail} as a friend on Quranki`;
    }
  }
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: "https://quranki.com/login",
      siteName: "Quranki",
      type: "website",
      images: [
        {
          url: "/quranki-preview.png",
          width: 1200,
          height: 630,
          alt: "Quranki - Intelligent Quran Review System",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/quranki-preview.png"],
    },
    metadataBase: new URL("https://quranki.com"),
  };
} 