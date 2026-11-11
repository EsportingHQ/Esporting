import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How EsportingHQ collects, uses, and protects personal data, and the choices and rights you have.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy | EsportingHQ',
    description: 'How EsportingHQ collects, uses, and protects personal data.',
    url: 'https://esportinghq.com/privacy',
  },
};

const sections: LegalSection[] = [
  {
    id: 'overview',
    heading: 'Overview',
    body: (
      <>
        <p>
          This policy explains what personal data EsportingHQ collects when you use
          esportinghq.com, why we collect it, and the rights you have. We aim to handle data in
          line with the Nigeria Data Protection Act 2023 (NDPA) and to collect only what we
          need.
        </p>
        <p>
          <strong>We do not sell your personal data.</strong>
        </p>
      </>
    ),
  },
  {
    id: 'what-we-collect',
    heading: 'What we collect',
    body: (
      <>
        <ul>
          <li>
            <strong>Waitlist.</strong> Your email address and the role you pick (fan, gamer,
            team, or organizer).
          </li>
          <li>
            <strong>Accounts.</strong> Your email address, username, and any display name,
            avatar, or bio you choose to add, plus the role assigned to your account.
          </li>
          <li>
            <strong>Competition data.</strong> Organizers and contributors may enter player and
            team details such as gamertag, name, country, avatar, team membership, and match
            results. This appears publicly on player and team pages.
          </li>
          <li>
            <strong>Activity records.</strong> Actions taken in organizer and contributor tools,
            such as results entered and corrections made, so we can keep scores accurate.
          </li>
          <li>
            <strong>On your device.</strong> Your favorites, theme, and notification
            preferences are stored in your browser&apos;s local storage on your device and are
            not sent to us.
          </li>
          <li>
            <strong>Technical data.</strong> Our hosting and security providers process
            standard connection data such as IP address, browser type, and request logs to keep
            the Service running and secure.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use',
    heading: 'How we use it',
    body: (
      <>
        <ul>
          <li>to run the Service, show scores, and operate competition tools;</li>
          <li>to create and secure your account and manage roles;</li>
          <li>to email you about our launch if you joined the waitlist;</li>
          <li>to correct data, prevent abuse, and keep the platform secure;</li>
          <li>to understand how the Service is used so we can improve it;</li>
          <li>to meet legal obligations.</li>
        </ul>
        <p>
          Where the law requires a basis for this processing, we rely on your consent
          (for example, joining the waitlist), on performing our agreement with you (running
          your account), and on our legitimate interests in operating a secure and accurate
          platform.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    heading: 'Who we share it with',
    body: (
      <>
        <p>
          We use service providers to run EsportingHQ, including providers for hosting, our
          database and authentication, and email delivery. They process data on our behalf and
          only as needed to provide those services.
        </p>
        <p>
          Competition data you or others enter about players and teams is public by design. We
          may also disclose data where the law requires it or to protect our users and the
          Service. If EsportingHQ is ever merged with or acquired by another business, personal
          data may transfer as part of that deal, and we will tell you if that changes how your
          data is used.
        </p>
      </>
    ),
  },
  {
    id: 'transfers',
    heading: 'Where data is processed',
    body: (
      <p>
        Our providers may store and process data on servers outside Nigeria. When data
        leaves Nigeria we take steps to make sure it stays protected as the NDPA requires.
      </p>
    ),
  },
  {
    id: 'retention',
    heading: 'How long we keep it',
    body: (
      <p>
        We keep personal data only as long as we need it for the purposes above. Waitlist
        emails are kept until launch communications are complete or you ask us to remove
        them. Account data is kept while your account is open. Match and competition records
        may be kept longer so that historical results stay accurate.
      </p>
    ),
  },
  {
    id: 'security',
    heading: 'Security',
    body: (
      <p>
        We use access controls and encrypted connections to protect data. No system is
        completely secure, so we cannot guarantee absolute security, but we work to protect
        your information and will act promptly on any breach as the law requires.
      </p>
    ),
  },
  {
    id: 'your-rights',
    heading: 'Your rights',
    body: (
      <>
        <p>You have the right to:</p>
        <ul>
          <li>ask whether we hold your personal data and get a copy;</li>
          <li>have inaccurate data corrected;</li>
          <li>ask us to delete your data, where we no longer need it;</li>
          <li>object to or restrict certain processing;</li>
          <li>withdraw consent at any time, for example by asking to leave the waitlist.</li>
        </ul>
        <p>
          If you are a player and want details removed or corrected on a profile an organizer
          created, contact us and we will deal with it. You can also complain to the Nigeria
          Data Protection Commission (NDPC) if you think your data has been mishandled.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    heading: 'Children',
    body: (
      <p>
        The Service is not directed at children under 13, and we do not knowingly collect
        their personal data. If you are under 18, please get a parent or guardian&apos;s
        permission before creating an account. If you believe a child has given us personal
        data without permission, contact us and we will delete it.
      </p>
    ),
  },
  {
    id: 'cookies',
    heading: 'Cookies and local storage',
    body: (
      <p>
        We use essential cookies to keep you signed in and secure, and local storage to
        remember your favorites and display settings. We do not currently use advertising
        cookies. If we add analytics or advertising tools, we will update this policy first.
      </p>
    ),
  },
  {
    id: 'changes',
    heading: 'Changes to this policy',
    body: (
      <p>
        We may update this policy as the Service changes. When we make a material change,
        we will update the date at the top of this page.
      </p>
    ),
  },
  {
    id: 'contact',
    heading: 'Contact',
    body: (
      <p>
        To use your rights or ask a privacy question, message us at{' '}
        <strong>@esportinghq</strong> on X, Instagram, or TikTok.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="Your privacy matters to us. This policy explains what we collect, why, and the choices you have."
      sections={sections}
    />
  );
}
