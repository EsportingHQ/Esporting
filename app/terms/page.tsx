import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that apply when you use EsportingHQ for live esports scores, match tracking, and competition tools.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms of Service | EsportingHQ',
    description: 'The terms that apply when you use EsportingHQ.',
    url: 'https://esportinghq.com/terms',
  },
};

const sections: LegalSection[] = [
  {
    id: 'about',
    heading: 'About these terms',
    body: (
      <>
        <p>
          These terms govern your use of the EsportingHQ website and related services
          (the &quot;Service&quot;) at esportinghq.com. EsportingHQ is a live esports scores and
          match-tracking platform. By using the Service you agree to these terms. If you do
          not agree, please do not use it.
        </p>
        <p>
          You must be at least 13 years old to use the Service. If you are under 18, you need
          the permission of a parent or guardian.
        </p>
      </>
    ),
  },
  {
    id: 'service',
    heading: 'What the Service does',
    body: (
      <>
        <p>
          EsportingHQ publishes scores, schedules, results, standings, team and player
          information, and news for esports competitions. Match data is entered by assigned
          contributors and tournament organizers, and updates may appear as a match is played.
        </p>
        <p>
          <strong>Scores may contain errors.</strong> Live data can be delayed, corrected, or
          reversed. We do not guarantee that anything on the Service is accurate, complete, or
          up to date, and you should not rely on it for any decision with financial
          consequences.
        </p>
        <p>
          EsportingHQ is not a betting, gambling, or wagering service, and does not accept
          bets or handle money for competitions.
        </p>
      </>
    ),
  },
  {
    id: 'accounts',
    heading: 'Accounts',
    body: (
      <>
        <p>
          Some features require an account. You are responsible for the information you give
          us, for keeping your login secure, and for everything done through your account.
          Tell us promptly if you think your account has been misused.
        </p>
        <p>
          Accounts for organizers, contributors, and administrators are created by invitation
          and carry extra responsibilities described below. We may change or withdraw these
          roles at any time.
        </p>
      </>
    ),
  },
  {
    id: 'organisers-contributors',
    heading: 'Organizers and contributors',
    body: (
      <>
        <p>If you enter or manage competition data, you agree to:</p>
        <ul>
          <li>report results and scores honestly and as accurately as you can;</li>
          <li>never enter false results, manipulate outcomes, or alter results for payment or advantage;</li>
          <li>only add information about players and teams that you are entitled to share;</li>
          <li>correct mistakes promptly using the correction tools provided.</li>
        </ul>
        <p>
          We may correct, hide, or remove any data, and suspend any role, where we believe
          these rules have been broken.
        </p>
      </>
    ),
  },
  {
    id: 'your-content',
    heading: 'Content you provide',
    body: (
      <>
        <p>
          You keep ownership of content you submit, such as profile details, team information,
          results, and news submissions. You give EsportingHQ a worldwide, non-exclusive,
          royalty-free licence to host, display, and distribute that content as part of
          operating and promoting the Service.
        </p>
        <p>
          You confirm that you have the right to submit it and that it does not break the law
          or anyone else&apos;s rights.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    heading: 'Acceptable use',
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>break the law or infringe anyone&apos;s rights;</li>
          <li>harass, threaten, or impersonate others, or post hateful or abusive content;</li>
          <li>post false match results or misleading information;</li>
          <li>scrape, copy, or resell our data in bulk without written permission;</li>
          <li>attempt to break, overload, or gain unauthorised access to the Service or other accounts;</li>
          <li>upload malware or anything designed to disrupt the Service.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'intellectual-property',
    heading: 'Intellectual property',
    body: (
      <>
        <p>
          The EsportingHQ name, logo, design, and software are ours or our licensors&apos; and
          are protected by law. Using the Service does not give you ownership of any of them.
        </p>
        <p>
          Game titles, publisher names, team names, and logos shown on the Service belong to
          their respective owners and are used to identify the competitions we cover.
          EsportingHQ is an independent platform and is not affiliated with, endorsed by, or
          sponsored by any game publisher unless we say so.
        </p>
      </>
    ),
  },
  {
    id: 'third-parties',
    heading: 'Third-party links and services',
    body: (
      <p>
        The Service may link to or rely on services run by others, including streaming
        platforms, sponsors, and hosting providers. We do not control them and are not
        responsible for their content or practices.
      </p>
    ),
  },
  {
    id: 'availability',
    heading: 'Availability and changes',
    body: (
      <p>
        We work to keep the Service running but do not promise it will always be available or
        free of faults. We may change, suspend, or end any part of the Service, including
        features and supported games, at any time.
      </p>
    ),
  },
  {
    id: 'suspension',
    heading: 'Suspension and termination',
    body: (
      <p>
        We may suspend or close your account or restrict access if you break these terms or
        put the Service or other users at risk. You can stop using the Service at any time and
        may ask us to delete your account as described in our Privacy Policy.
      </p>
    ),
  },
  {
    id: 'disclaimer',
    heading: 'Disclaimers and liability',
    body: (
      <>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available&quot;, without
          warranties of any kind, to the fullest extent the law allows.
        </p>
        <p>
          To the fullest extent the law allows, EsportingHQ is not liable for indirect or
          consequential loss, loss of profits or data, or losses arising from errors, delays,
          or corrections in match information. Nothing in these terms limits liability that
          cannot lawfully be limited.
        </p>
      </>
    ),
  },
  {
    id: 'law',
    heading: 'Governing law',
    body: (
      <p>
        These terms are governed by the laws of the Federal Republic of Nigeria. Courts in
        Nigeria have jurisdiction over any dispute, unless the law of your country of residence
        gives you rights that cannot be waived.
      </p>
    ),
  },
  {
    id: 'changes',
    heading: 'Changes to these terms',
    body: (
      <p>
        We may update these terms as the Service grows. When we make a material change, we
        will update the date at the top of this page. Continuing to use the Service after a
        change means you accept the updated terms.
      </p>
    ),
  },
  {
    id: 'contact',
    heading: 'Contact',
    body: (
      <p>
        Questions about these terms? Message us at <strong>@esportinghq</strong> on X,
        Instagram, or TikTok.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="Please read these terms before using EsportingHQ. They explain what you can expect from us and what we expect from you."
      sections={sections}
    />
  );
}
