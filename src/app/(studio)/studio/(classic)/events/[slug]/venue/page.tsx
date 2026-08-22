import { redirect } from 'next/navigation';

interface VenuePageProps {
  params: Promise<{ slug: string }>;
}

/*
 * The venue is edited in the Console now, and this address is kept only
 * so a bookmark still lands somewhere true.
 *
 * What stood here wrote `address`, `mapUrl`, `mapLabel`, a description
 * and four detail rows into the legacy scene document — a record no
 * public route has rendered since Experience Engine v2. An organizer
 * could type the real street address of a real building and no visitor
 * would ever be shown it. A form that promises publication and delivers
 * none is worse than an absent one, so it does not survive its
 * replacement.
 *
 * Every field it offered now exists on the conference's own record and
 * reaches the information page: name, address, map link, narrative,
 * accessibility and emergency information, and the arrival facts that
 * replaced the fixed parking and transit rows.
 */
const VenuePage = async ({ params }: VenuePageProps) => {
  const { slug } = await params;
  redirect(
    `/studio/experiences/${encodeURIComponent(slug)}?scene=conference-venue`,
  );
};

export default VenuePage;
