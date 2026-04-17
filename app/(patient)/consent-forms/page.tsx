import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  FileText,
  Lock,
  ShieldCheck,
} from "lucide-react";

export const metadata = {
  title: "Consent Forms — L-Evate",
  description: "Please review the following consent documents carefully.",
};

type Section = {
  id: string;
  title: string;
  blurb?: string;
  body: ReactNode;
};

const sections: Section[] = [
  {
    id: "client-agreement-form",
    title: "Client Agreement Form",
    blurb: "Liability, fees, cancellations, and your overall agreement with the Practice.",
    body: <ClientAgreementBody />,
  },
  {
    id: "notice-of-privacy-practices",
    title: "Notice of Privacy Practices",
    blurb: "How your protected health information may be used and disclosed.",
    body: <NoticeOfPrivacyPracticesBody />,
  },
  {
    id: "privacy-practices-acknowledgment",
    title: "Privacy Practices Acknowledgment",
    blurb: "Your acknowledgment of HIPAA rights and privacy practices.",
    body: <PrivacyAcknowledgmentBody />,
  },
  {
    id: "client-consent-to-evaluation-and-treatment",
    title: "Client Consent to Evaluation and Treatment",
    blurb: "Consent for the Professional Staff to evaluate and treat you.",
    body: <ConsentToTreatmentBody />,
  },
  {
    id: "client-consent-to-photography",
    title: "Client Consent to Photography",
    blurb: "Consent and authorization for clinical and marketing photography.",
    body: <ConsentToPhotographyBody />,
  },
  {
    id: "client-contact-authorization",
    title: "Client Contact Authorization",
    blurb: "Your communication preferences for treatment and reminders.",
    body: <ContactAuthorizationBody />,
  },
  {
    id: "informed-consent-for-off-label-drug-use",
    title: "Informed Consent for Off-Label Drug Use",
    blurb: "Use of FDA-approved medications for off-label therapeutic purposes.",
    body: <OffLabelDrugUseBody />,
  },
];

export default function ConsentFormsPage() {
  return (
    <div className="-my-8 min-h-[calc(100vh-220px)] w-screen bg-[#f4f6f9] pb-16 pt-8 [margin-inline:calc(50%-50vw)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5b6572] transition-colors hover:text-[#0a51b7]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>

        <header className="mb-10 flex flex-col items-center text-center">
          <span aria-hidden className="mb-5 block h-[3px] w-12 rounded-full bg-[#f59e0b]" />
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#101828] sm:text-[40px] sm:leading-[1.1]">
            Consent Forms
          </h1>
          <p className="mt-3 max-w-xl text-sm text-[#5b6572] sm:text-base">
            Please review the following consent documents carefully.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-[#5b6572]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-white px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#0a51b7]" /> HIPAA-compliant
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-white px-3 py-1">
              <Lock className="h-3.5 w-3.5 text-[#0a51b7]" /> Encrypted at rest
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-white px-3 py-1">
              <FileText className="h-3.5 w-3.5 text-[#0a51b7]" /> {sections.length} documents
            </span>
          </div>
        </header>

        <nav
          aria-label="On this page"
          className="mb-6 rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
            On this page
          </p>
          <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <Link
                  href={`#${s.id}`}
                  className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[#374151] transition-colors hover:bg-[#f1f5fb] hover:text-[#0a51b7]"
                >
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-[11px] font-semibold text-[#0a51b7] group-hover:bg-[#0a51b7] group-hover:text-white">
                    {i + 1}
                  </span>
                  <span className="truncate">{s.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-3">
          {sections.map((s, i) => (
            <details
              key={s.id}
              id={s.id}
              className="group scroll-mt-24 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_1px_2px_0_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.12)] open:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]"
            >
              <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-[#fafbfc] [&::-webkit-details-marker]:hidden">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-xs font-semibold text-[#0a51b7] group-open:bg-[#0a51b7] group-open:text-white">
                  {i + 1}
                </span>
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold text-[#101828]">
                    {s.title}
                  </span>
                  {s.blurb && (
                    <span className="mt-0.5 block text-[13px] text-[#6b7280] group-open:hidden">
                      {s.blurb}
                    </span>
                  )}
                </span>
                <ChevronDown
                  aria-hidden
                  className="mt-1.5 h-4 w-4 shrink-0 text-[#9ca3af] transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <div className="border-t border-[#f0f1f4] bg-[#fcfcfd] px-5 py-6 text-[14.5px] leading-relaxed text-[#374151] sm:px-7">
                <article className="space-y-5">{s.body}</article>
                <DigitalSignatureNote />
              </div>
            </details>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between gap-4 rounded-xl border border-[#e5e7eb] bg-white px-5 py-4 text-xs text-[#6b7280] shadow-[0_1px_2px_0_rgba(15,23,42,0.04)]">
          <span>
            Questions about any of these documents? Contact your practitioner before signing.
          </span>
          <Link
            href="#top"
            className="inline-flex items-center gap-1 font-medium text-[#0a51b7] hover:underline"
          >
            <ArrowUp className="h-3.5 w-3.5" /> Back to top
          </Link>
        </div>
      </div>
    </div>
  );
}

function ClientAgreementBody() {
  return (
    <>
      <P>
        I, the undersigned, desire to become a client of L-Evate Network LLC
        (the &ldquo;<Strong>Practice or Doctor Group</Strong>&rdquo;) and be
        treated by the Practice&apos;s Professional Staff (defined as the
        individuals retained on the Practice&apos;s behalf who are qualified in
        healthcare-related professions and whose primary responsibilities,
        including delivering healthcare services to clients, require the
        exercise of medical judgment and discretion).
      </P>

      <Clause number="1" title="Liability and Waiver of Liability">
        <P>
          I understand that I will provide self-administration of all
          over-the-counter medications and prescriptions recommended and
          prescribed by the Professional Staff, and such over-the-counter
          medications and prescriptions may be in the form of pill, injection,
          troche, patch, or nasal spray. I understand that I will be educated on
          how to administer such over-the-counter medications and prescriptions
          and if I wish to not self-administer over-the-counter medications or
          prescriptions, I may visit the Practice&apos;s physical location for
          assistance, but additional fees may apply. I understand that
          self-administration is at my own risk and the Practice nor the
          Professional Staff shall be liable for any injuries or damages to me
          caused by self-administration, or be subject to any claims, demands,
          actions, causes of actions or damages. I, and on behalf of my personal
          representatives, heirs, administrators, assigns and successors do
          hereby expressly forever release and discharge the Practice, its
          successors and assigns, as well as its officers, agents and employees
          from all such claims, demands, actions, causes of actions or damages.
        </P>
      </Clause>

      <Clause number="2" title="Therapy">
        <P>
          The Practice will require bloodwork to be done before any client can
          begin any type of therapy offered by it. Once results are obtained,
          the Professional Staff must review such results to provide a plan
          towards health optimization using recommended therapies. The therapy
          or therapies suggested is/are based on the client&apos;s bloodwork and
          not anyone&apos;s personal opinion. Please keep in mind that these
          therapies are not 100% guaranteed and the Practice nor the
          Professional Staff shall be held responsible for any possible side
          effects, results, diseases or even death that may be associated with
          therapies.
        </P>
      </Clause>

      <Clause number="4" title="Fees">
        <P>
          Fees depend on the lab package I select, and the medications
          prescribed by the Professional Staff. The Practice offers three
          packages, the details of which are fully explained on{" "}
          <a
            href="https://evolvewellnessgroup.com/order-labs/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#0a51b7] underline-offset-2 hover:underline"
          >
            evolvewellnessgroup.com/order-labs
          </a>
          : the (1) Stone Age Package ($150.00), (2) Iron Age Package ($300.00)
          and (3) Modern Era Package ($400.00). I understand the medications
          prescribed vary in price and may be prescribed on a
          subscription-basis.
        </P>
        <P>
          I understand and agree that all services rendered to me by the
          Professional Staff and/or the Practice may be charged directly to me,
          and that I am personally responsible for full payment. I understand
          that even if I suspend or terminate treatment, any fees for
          professional services rendered to me up to the point of termination
          will be immediately due and payable. I understand that payment in full
          is due at the time of each session and/or consultation and upon
          ordering or product.
        </P>
        <P>
          I acknowledge that the Practice reserves the right to charge a no
          show/cancellation fee if I do not attend or cancel a scheduled
          appointment without providing 24-hour prior notice to the Practice. I
          further acknowledge that the Practice reserves the right to reschedule
          my appointment if I am more than 15 minutes late to the scheduled
          appointment.
        </P>
      </Clause>

      <Clause
        number="5"
        title="Suspension/Termination of Client/The Practice Relationship"
      >
        <P>
          The Practice has the right to suspend and/or terminate my client
          relationship for non-payment of sessions, consultations, prescription
          orders, inappropriate behavior towards the Practice&apos;s staff,
          non-compliance with treatment plans or for any other reason deemed
          sufficient in the sole discretion of the Practice.
        </P>
      </Clause>

      <Clause number="6" title="Cancellation, Refunds">
        <P>
          The Practice has a strict no refund policy. I acknowledge that by
          purchasing services and/or products from the Practice, I authorize the
          Professional Staff and/or Practice to order products for my treatment,
          including prescriptions, in advance. I understand that certain
          products have short shelf lives and require timed ordering. In the
          event I desire to cancel the purchased product(s) at any time, the
          Practice may approve the cancellation, however, I will remain
          responsible for the full cost of the purchased product(s) that have
          already been ordered and I understand that under no circumstance will
          I be given a refund in such case.
        </P>
      </Clause>

      <Clause number="7" title="Entire Agreement">
        <P>
          This agreement constitutes the entire and exclusive agreement between
          the Practice and me. Any promise, representation, understanding, oral
          or written, pertaining directly or indirectly to the agreement, which
          is not continued herein, are hereby waived.
        </P>
      </Clause>
    </>
  );
}

function NoticeOfPrivacyPracticesBody() {
  return (
    <>
      <Banner>
        THIS NOTICE DESCRIBES HOW MEDICAL INFORMATION ABOUT YOU MAY BE USED AND
        DISCLOSED AND HOW YOU CAN GET ACCESS TO THIS INFORMATION. PLEASE REVIEW
        IT CAREFULLY.
      </Banner>

      <Subhead>Understanding Your Health Record/Information</Subhead>
      <P>
        This notice describes the practices of L-Evate Network LLC (the &ldquo;
        <Strong>Practice or Doctor Group</Strong>&rdquo;) with respect to your
        protected health information created while you are a client at the
        Practice. Those at the Practice with access to your records are subject
        to this notice. In addition, the Practice and Professional Staff may
        share medical information with each other for treatment, payment or
        health care operations described in this notice.
      </P>
      <P>
        We create a record of the care and services you receive at the
        Practice. We understand that medical information about you and your
        health is personal. We are committed to protecting medical information
        about you.
      </P>
      <P>
        This notice tells you about the ways in which We may use and disclose
        medical information about you and describes your rights and certain
        obligations We have regarding the use and disclosure of your medical
        information.
      </P>

      <Subhead>Your Health Information Rights</Subhead>
      <P>
        Although your health record is the physical property of the Practice,
        the information belongs to you. You have the right to:
      </P>
      <Bullets
        items={[
          "Request restrictions on certain uses and disclosures of your information for treatment, payment and health care operations, and as to disclosures permitted to persons, including family members involved with your care and as provided by law. However, We are not required by law to agree to a requested restriction, unless the request relates to a restriction on disclosures to your health insurer regarding health care items or services for which you have paid out of pocket and in full;",
          "Obtain a paper copy of this notice of information practices;",
          "Inspect and request a copy of your health record as provided by law;",
          "Request that we amend your health record as provided by law. We will notify you if we are unable to grant your request to amend your health record;",
          "Obtain an accounting of disclosures of your health information as provided by law; and",
          "Request communication of your health information by alternative means or at alternative locations. We will accommodate reasonable requests.",
        ]}
      />
      <P>
        You may exercise your rights set forth in this notice by providing a
        written request to the Practice at the below email or mailing address:
      </P>
      <ContactCard
        email="signup@l-evatenetwork.com"
        address="2719 Letap Court, Land O' Lakes, Florida 34638"
      />

      <Subhead>The Practice&apos;s Responsibilities</Subhead>
      <P>
        In addition to the responsibilities set forth above, We are also
        required to:
      </P>
      <Bullets
        items={[
          "Maintain the privacy of your health information;",
          "Subject to certain exceptions under the law, provide notice of any unauthorized acquisition, access, use or disclosure of your protected health information, to the extent it was not otherwise secured;",
          "Provide you with a notice as to the Practice's legal duties and privacy practices with respect to information We maintain about you;",
          "Abide by the terms of this notice; and",
          "Notify you if We are unable to agree to a requested restriction on certain uses and disclosures.",
        ]}
      />
      <P>
        We reserve the right to change our practices and to make added/removed
        provisions effective immediately for all protected health information We
        maintain, including information created or received before the change.
        Should the Practice&apos;s information practices change, We are not
        required to notify you, but We will have the revised notice available
        upon your request to the Practice. If or when We change our notice, We
        will post the new notice at the office of each practice location where
        it can be seen.
      </P>

      <Subhead>
        Uses and Disclosures of Medical Information That Do Not Require Your
        Authorization
      </Subhead>
      <P>
        The following categories describe different ways the Practice may use
        and disclose medical information about you without your authorization.
      </P>

      <Em>We will use your health information for treatment.</Em>
      <Bullets
        items={[
          <>
            <Strong>For example:</Strong> We may disclose medical information
            about you to doctors, nurses, technicians, medical students or other
            personnel who are involved in taking care of you. We may share
            medical information about you in order to coordinate different
            treatments, such as prescriptions, lab work and x-rays. We may
            provide your physician or a subsequent health care provider with
            copies of various reports to assist in treating you once you are
            discharged from care at the Practice.
          </>,
        ]}
      />

      <Em>We will use your health information for payment.</Em>
      <Bullets
        items={[
          <>
            <Strong>For example:</Strong> A bill may be sent to you or a
            third-party payer. The information on or accompanying the bill may
            include information that identifies you, as well as your diagnosis,
            procedures and supplies used.
          </>,
        ]}
      />

      <Em>We will use your health information for regular health care operations.</Em>
      <Bullets
        items={[
          <>
            <Strong>For example:</Strong> We may use the information in your
            health record to assess the care and outcome in your case and others
            like it. This information will then be used in an effort to
            continually improve the quality and effectiveness of the health care
            and services we provide.
          </>,
        ]}
      />

      <Em>
        We will use and disclose your health information as otherwise allowed
        by law. Examples of those uses and disclosures follow:
      </Em>
      <Bullets
        items={[
          <>
            <Strong>Business associates:</Strong> There are some services
            provided in our organization through agreements with business
            associates. Examples include answering services and copy services.
            To protect your health information, however, We require business
            associates to appropriately safeguard your information.
          </>,
          <>
            <Strong>Notification:</Strong> Unless you object, We may use or
            disclose information to notify or assist in notifying a family
            member, a personal representative or another person responsible for
            your care about your location and general condition.
          </>,
          <>
            <Strong>Individuals involved in your care:</Strong> Unless you
            object, We may disclose to a family member, another relative, a
            close personal friend or another person you identify the health
            information that is directly relevant to that person&apos;s
            involvement in your health care or payment for your health care.
          </>,
          <>
            <Strong>Disaster relief:</Strong> We may use or disclose your health
            information to public or private disaster relief organizations to
            coordinate your care or to notify your family or friends of your
            location or condition in a disaster.
          </>,
          <>
            <Strong>Research:</Strong> We may disclose information to
            researchers when their research has been approved by an
            institutional review board that has established protocols to protect
            the privacy of your health.
          </>,
          <>
            <Strong>Communications regarding treatment alternatives and appointment reminders:</Strong>{" "}
            We may contact you to provide appointment reminders or information
            about treatment alternatives or other health-related benefits and
            services that may be of interest to you.
          </>,
          <>
            <Strong>Food and Drug Administration (FDA):</Strong> We may disclose
            to the FDA health information relative to adverse events with
            respect to food, medications, devices, supplements, products and
            product defects, or post marketing surveillance information to
            enable product recalls, repairs or replacement.
          </>,
          <>
            <Strong>Worker&apos;s compensation:</Strong> We may disclose health
            information to the extent authorized by and to the extent necessary
            to comply with laws relating to worker&apos;s compensation or other
            similar programs established by law.
          </>,
          <>
            <Strong>Public health:</Strong> As required by law, We may disclose
            your health information to public health or legal authorities
            charged with preventing or controlling disease, injury or
            disability.
          </>,
          <>
            <Strong>Abuse, neglect or domestic violence:</Strong> As required by
            law, We may disclose health information to a governmental
            representative authorized by law to receive reports of abuse,
            neglect or domestic violence.
          </>,
          <>
            <Strong>Judicial, administrative and law enforcement purposes:</Strong>{" "}
            Consistent with applicable law, We may disclose health information
            about you for judicial, administrative and law enforcement purposes.
          </>,
          <>
            <Strong>Health oversight activities:</Strong> We may disclose health
            information to a health oversight agency for activities authorized
            by law, such as audits, investigations, inspections and licensure.
          </>,
          <>
            <Strong>Threats to health or safety:</Strong> We may use or disclose
            health information as allowed by law if We believe in good faith
            that it is necessary to prevent or lessen a serious and imminent
            threat to the health or safety of a person or the public.
          </>,
          <>
            <Strong>Special government functions:</Strong> We may disclose
            health information to authorized federal officials for intelligence,
            counterintelligence and other national security activities
            authorized by law.
          </>,
          <>
            <Strong>Required or allowed by law:</Strong> We will disclose
            medical information about you when required or allowed to do so by
            federal, state or local law.
          </>,
          <>
            <Strong>Electronic Health Information Exchange:</Strong> The
            Practice uses a third-party vendor to maintain our electronic
            medical records (EMR). The Practice stores electronic health
            information about you in the EMR. The Practice monitors who can
            view your EMR.
          </>,
        ]}
      />

      <Subhead>When We Need Your Written Authorization</Subhead>
      <P>
        We will not use or disclose your health information without your written
        authorization, except as described in this notice.
      </P>

      <Subhead>For More Information or to Report a Problem</Subhead>
      <P>
        If you have questions and would like additional information, you may
        contact the Practice at the email or mailing address listed in this{" "}
        <Em inline>Notice of Privacy Practices</Em>.
      </P>
      <P>
        If you believe your privacy rights have been violated, you can send a
        complaint to the Practice or to the Secretary of Health and Human
        Services. There will be no retaliation for filing a complaint.
      </P>

      <Note>This notice is effective as of: January 1, 2026</Note>
    </>
  );
}

function PrivacyAcknowledgmentBody() {
  return (
    <>
      <P>
        I, the undersigned, understand that under the Health Insurance
        Portability &amp; Accountability Act of 1996 (HIPAA), I have certain
        rights to privacy regarding my protected health information. I
        understand that this information can and will be used to:
      </P>
      <Bullets
        items={[
          "Conduct, plan and direct my treatment and follow-up among the multiple health care providers who may be involved in that treatment directly and indirectly;",
          "Obtain payment from third-party payers; and",
          "Conduct normal health care operations, such as quality assessments and physician certifications.",
        ]}
      />
      <P>
        I acknowledge that I have been provided with the{" "}
        <Em inline>Notice of Privacy Practices</Em> containing a more complete
        description of the uses and disclosures of my health information. I
        understand that the Practice has the right to change its{" "}
        <Em inline>Notice of Privacy Practices</Em> from time to time and that I
        may contact this organization at any time at the address provided for in
        the <Em inline>Notice of Privacy Practices</Em> to obtain a current copy
        of the <Em inline>Notice of Privacy Practices</Em>.
      </P>
      <P>
        I understand that I may request in writing that the Practice restrict
        how my medical information/records are used or disclosed to carry out
        treatment, payment or health care operations. I also understand the
        Practice is not required to agree to my requested restrictions, but if
        it does agree, then the Practice is bound to abide by such restrictions.
      </P>
      <Note>
        I acknowledge that my medical information/records will be released to
        the Practice. I further acknowledge that my medical
        information/records will be released from the Practice to my primary
        care provider, referring/consulting providers and my insurance company
        to process insurance claims.
      </Note>
      <P>
        I also allow release of my medical information to additional individuals
        I designate (e.g., family members or caregivers). You may add or
        update those individuals at any time by contacting the Practice.
      </P>
    </>
  );
}

function ConsentToTreatmentBody() {
  return (
    <>
      <P>
        I, the undersigned, do hereby request and consent to evaluations and
        treatments by the Professional Staff (defined as the individuals
        retained on L-Evate Network LLC (the &ldquo;
        <Strong>Practice or Doctor Group</Strong>&rdquo;) behalf who are
        qualified in healthcare-related professions and whose primary
        responsibilities, including delivering healthcare services to clients,
        require the exercise of medical judgment and discretion).
      </P>
      <P>
        I understand that no specific treatment plan has been recommended at
        the time of this consent&apos;s execution, and that a specific treatment
        plan will not be recommended until the Professional Staff has the
        opportunity to identify my needs. This consent provides the
        Professional Staff my permission to perform reasonable and necessary
        medical evaluations, testing and treatment. I understand that I have the
        right to be informed about any diagnosis and the options for recommended
        treatment, and that I may then decide whether to undergo any suggested
        treatment, after being informed of the potential benefits and risks
        involved.
      </P>
      <P>
        I understand the Professional Staff provides a variety of treatment and
        services, including but not limited to medical treatment, health and
        wellness guidance, and prescribing prescriptions.
      </P>
      <P>
        I wish to rely on the Professional Staff to exercise judgment for my
        best interest during the course of treatment. I will inform the
        Professional Staff and, if applicable, the Practice of any sensitive
        areas or adverse conditions that I may have had prior to, during or
        after treatment.
      </P>
      <P>
        I understand the practice of medicine is not an exact science and
        accept that fees are paid for performance of medical services only, and
        not a guaranteed result. I acknowledge that although a good outcome is
        expected, and a reasonable effort has been made to establish realistic
        expectations, there cannot be any warranty, expressed or implied, as to
        the results that may be obtained.
      </P>
      <P>
        I intend this consent to cover the entire course of treatment and I
        understand that this consent will remain fully effective until it is
        revoked in writing. This consent may be revoked by contacting the
        Practice through email or mail, at the address listed in the{" "}
        <Em inline>Notice of Privacy Practices</Em> and informing the Practice
        of my revocation.
      </P>
      <P>
        I request and consent to be transported by the Professional Staff
        and/or the Practice and/or emergency medical services to a hospital or
        emergency medical facility in the event of a medical emergency during
        the course of my treatment at the Practice.
      </P>
      <P>
        I have read this form in its entirety and agree to be bound by all of
        its terms and conditions as described above.
      </P>
    </>
  );
}

function ConsentToPhotographyBody() {
  return (
    <>
      <Banner>
        PLEASE READ EACH SECTION CAREFULLY. YOU MAY REQUEST A COPY OF THIS FORM
        FOR YOUR OWN RECORDS.
      </Banner>

      <P>I, the undersigned, understands and agrees as follows:</P>

      <P>
        I consent to have photographs, videotapes, digital or audio recordings,
        and/or images of me, and any other method to reproduce or edit my
        likeness or image now known or hereafter developed (collectively,
        &ldquo;<Strong>Photography</Strong>&rdquo;), taken by Evolve Wellness
        Group LLC and its staff (collectively &ldquo;<Strong>Practice</Strong>
        &rdquo;). I understand that such Photography will be recorded to
        document and assist with my care and to assist with the Practice&apos;s
        health care operations.
      </P>
      <P>
        The Practice desires to utilize the Photography for purposes of
        professional publications, training, education, or clinical evaluation
        as well as on social media, including posting on social media accounts,
        including, but not limited to the Practice&apos;s website and social
        media platforms (&ldquo;<Strong>Social Media</Strong>&rdquo;) and
        including such use in the Practice&apos;s email marketing campaigns,
        all of which will result in the publication and distribution of
        protected health information to the general public. The Practice IS NOT
        receiving direct or indirect remuneration from a third party in
        connection with the use/disclosure of the protected health information
        described in this authorization.
      </P>
      <P>
        I understand the Photography will be used on the Practice&apos;s
        website, social media, and email marketing, in which I have agreed to
        participate as a patient of the Practice. I further understand that the
        use of the Photography in social media and marketing may incidentally
        disclose additional protected health information related to my
        treatment, condition, procedure, or other protected health information
        associated with such use, and I authorize such disclosure.
      </P>
      <P>
        I understand I have the right to revoke this authorization, in writing,
        at any time by sending such written notification to the Practice at the
        email or address listed in the Practice&apos;s{" "}
        <Em inline>Notice of Privacy Practices</Em>. I understand a revocation
        is not effective to the extent the Practice has relied on the use or
        disclosure of the protected health information. This authorization is
        valid until the earlier or the occurrence of my death; my reaching the
        age of majority; or permission is withdrawn.
      </P>
      <P>
        I understand, except as otherwise provided in this authorization, the
        Practice may use or disclose my protected health information in
        accordance with Practice&apos;s{" "}
        <Em inline>Notice of Privacy Practices</Em>. I understand information
        disclosed pursuant to this authorization may be subject to
        redisclosure by the recipient and may no longer be protected by the
        Health Insurance Portability and Accountability Act of 1996
        (&ldquo;HIPAA&rdquo;) or other applicable laws or regulations.
      </P>
      <P>
        I specifically agree the Practice shall have the right to interview,
        consult with and examine me at times as the Practice may reasonably
        request before, during and after my treatments, and the Practice shall
        have the right to use such interviews, consultations, or examinations
        on social media. I understand such use may result in these interviews,
        consultations and examinations being disclosed in the public domain.
      </P>
      <P>
        I understand the Practice does not condition treatment or payment on
        the signing of this form. I understand that I will not be entitled to
        any payment or other form of remuneration from the Practice as a
        result of any use of Photography.
      </P>
      <P>
        I release and hold harmless the Practice, its officers, staff and
        employees from any and all claims or causes of action that I may have
        of any nature whatsoever, which may in any manner result from use or
        disclosure of the Photography.
      </P>
      <P>
        I have read this form in its entirety and agree to be bound by all of
        its terms and conditions as described above.
      </P>
    </>
  );
}

function ContactAuthorizationBody() {
  return (
    <>
      <Banner>
        PLEASE NOTE THAT EVOLVE WELLNESS GROUP LLC DOES NOT DISCLOSE OR SELL
        ANY CLIENT PROTECTED HEALTH INFORMATION TO ANY THIRD-PARTY BUSINESS OR
        ONLINE DATABASE.
      </Banner>

      <P>
        I, the undersigned, authorize L-Evate Network LLC (the &ldquo;
        <Strong>Practice or Doctor Group</Strong>&rdquo;) to contact me
        regarding facets of my care, including requests for information,
        verification of payment or benefits, and reminders for appointments. I
        understand and accept that the Practice may leave messages on home or
        cell phone answering systems or send reminder cards by U.S. mail, email
        or text message.
      </P>

      <Subhead>Preferred method of communication</Subhead>
      <P>
        If the Practice needs to communicate with me regarding my treatment, I
        will indicate my preferred method of communication during onboarding:
      </P>
      <Bullets
        items={["Phone call", "Email", "Text message", "Other (specified at intake)"]}
      />

      <Subhead>Voicemail handling</Subhead>
      <P>
        If I have chosen a phone call as my preferred method of communication,
        the Practice may be required to leave a voicemail for me regarding my
        treatment. I will indicate one of the following preferences:
      </P>
      <Bullets
        items={[
          "Leave a message with detailed information regarding my treatment.",
          "Leave a message requesting that I call the Practice at a specified phone number.",
        ]}
      />

      <Subhead>Email and text messaging</Subhead>
      <P>
        From time to time, the Practice may utilize email or text messages to
        communicate with me both about my treatment and for marketing purposes.
        I will choose one of the following:
      </P>
      <Bullets
        items={[
          "Authorize the Practice to email or text me for both treatment and marketing purposes.",
          "Authorize the Practice to email or text me appointment and health reminders only.",
          "Do not authorize the Practice to email or text me.",
        ]}
      />

      <P>
        I understand that this authorization will remain in effect until I
        either submit a subsequent Client Contact Authorization changing my
        above stated preferences, or I revoke or withdraw this authorization in
        writing.
      </P>
      <P>
        I acknowledge and agree that the Practice and its employees, officers
        and physicians are released from any legal responsibility of liability
        for or resulting from the authorized disclosure of my health or billing
        information.
      </P>
      <P>
        I have read this form in its entirety and agree to be bound by all of
        its terms and conditions as described above.
      </P>
    </>
  );
}

function OffLabelDrugUseBody() {
  return (
    <>
      <P>I, the undersigned, understands and agrees as follows:</P>
      <P>
        When a drug or device is approved for medical use by the Food and Drug
        Administration (FDA), the manufacturer produces a &ldquo;label&rdquo; to
        explain its use. Once a device/medication is approved by the FDA,
        physicians may use it &ldquo;off-label&rdquo; for other purposes if
        they are well-informed about the product, base its use on firm
        scientific method and sound medical evidence, and maintain records of
        its use and effects.
      </P>
      <P>
        The Professional Staff (defined as the individuals retained on L-Evate
        Network LLC (the &ldquo;<Strong>Practice or Doctor Group</Strong>&rdquo;)
        behalf who are qualified in healthcare-related professions and whose
        primary responsibilities, including delivering healthcare services to
        clients, require the exercise of medical judgment and discretion)
        utilizes several drugs off-label that are indicated in obesity
        management, including but not limited to Human chorionic gonadotrophin (
        <Strong>hCG</Strong>) and other peptides. None of these drugs are
        currently FDA approved for the long-term management of obesity.
        However, there are many studies that show the safety and benefit of
        these medications in the long-term management of obesity and such
        studies suggest that there are no long-term cardiovascular risks or
        withdrawals associated with long-term use of this medication. These
        studies are available upon request.
      </P>

      <Subhead>Purpose of Off-Label Drug Use</Subhead>
      <P>
        The purpose of using certain drugs off-label is to treat my medical
        conditions and improve my quality of life. During the course of medical
        treatment, the Professional Staff may prescribe medications
        (&ldquo;Medications&rdquo;) for the management of Andropause, Male
        hypogonadism, low testosterone, erectile dysfunction (ED), anxiety,
        stress, anger, depression, sleep disturbances, weight loss or other
        medical conditions as diagnosed and treated from time to time
        (&ldquo;Treatment&rdquo;).
      </P>

      <Subhead>No Guarantees or Assurances Regarding Results from Treatment</Subhead>
      <P>
        The Professional Staff nor the Practice has made, are making, or will
        ever make, guarantees or assurances to me regarding specific results I
        may expect from obtaining Treatment and taking Medications.
      </P>

      <Subhead>Adverse Reactions</Subhead>
      <P>
        Treatment and Medications have the potential to produce side effects in
        me. These adverse reactions may be more significant in some
        individuals.
      </P>
      <P>
        Side effects of Human Chorionic Gonadotropin (<Strong>hCG</Strong>) and
        other peptides may include the following: Acne. Less serious side
        effects may include: Enlargement of penis and testes; Headache; Feeling
        restless or irritable; Growth of pubic hair; Mild swelling or water
        weight gain; Depression; Breast tenderness or swelling.
      </P>

      <Subhead>Client&apos;s Responsibility and Adverse Reactions</Subhead>
      <P>
        I have the sole responsibility to report all incidences of significant
        adverse reactions from Medications or Treatment to the Professional
        Staff and/or the Practice. I must report all significant adverse
        reactions to the Professional Staff and/or the Practice during normal
        business hours; however, if I am experiencing significant adverse
        reactions from Medications or Treatment after business hours, I shall
        IMMEDIATELY contact the emergency department of my local hospital or
        call 911.
      </P>

      <Subhead>Treatment</Subhead>
      <P>
        Treatment and Medications will not be provided unless a clinical need
        exists. Clinical need determination will be based on one or more of the
        following: physician consultation, physical examination and current
        medical history.
      </P>
      <P>
        I have read this form in its entirety and agree to be bound by all of
        its terms and conditions as described above. I acknowledge and agree
        that I have been given the opportunity to ask any questions and have
        either declined the opportunity to do so or had all my questions
        answered to my satisfaction.
      </P>
    </>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-[#101828]">{children}</strong>;
}

function Em({
  children,
  inline,
}: {
  children: ReactNode;
  inline?: boolean;
}) {
  if (inline) return <em className="italic text-[#374151]">{children}</em>;
  return (
    <p className="text-[14.5px] italic text-[#5b6572]">{children}</p>
  );
}

function Subhead({ children }: { children: ReactNode }) {
  return (
    <h3 className="pt-1 font-display text-[17px] font-semibold tracking-tight text-[#101828]">
      {children}
    </h3>
  );
}

function Clause({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-[#101828]">
        <span className="mr-1 text-[#0a51b7]">{number}.</span> {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-[#9ca3af]">
      {items.map((it, i) => (
        <li key={i} className="text-[14.5px] leading-relaxed text-[#374151]">
          {it}
        </li>
      ))}
    </ul>
  );
}

function Banner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[12.5px] font-semibold uppercase tracking-[0.04em] text-[#92400e]">
      {children}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border-l-4 border-[#0a51b7]/40 bg-[#eef3fb] px-4 py-3 text-[14px] text-[#1f2937]">
      {children}
    </div>
  );
}

function ContactCard({
  email,
  address,
}: {
  email: string;
  address: string;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-[#e5e7eb] bg-white p-4 sm:grid-cols-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
          Email
        </p>
        <a
          href={`mailto:${email}`}
          className="mt-0.5 block text-sm font-medium text-[#0a51b7] hover:underline"
        >
          {email}
        </a>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
          Mailing Address
        </p>
        <p className="mt-0.5 text-sm text-[#1f2937]">{address}</p>
      </div>
    </div>
  );
}

function DigitalSignatureNote() {
  return (
    <p className="mt-6 flex items-start gap-2 rounded-lg border border-dashed border-[#cbd5e1] bg-white px-4 py-3 text-[12.5px] text-[#5b6572]">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0a51b7]" />
      <span>
        Acknowledgment of this document is recorded electronically with your
        name, the timestamp, and your account ID when you complete intake. No
        wet signature is required.
      </span>
    </p>
  );
}
