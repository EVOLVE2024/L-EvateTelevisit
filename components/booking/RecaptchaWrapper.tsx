"use client";

import * as React from "react";
import ReCAPTCHA from "react-google-recaptcha";

type Props = {
  siteKey: string;
  onChange: (token: string | null) => void;
};

export const RecaptchaWrapper = React.forwardRef<ReCAPTCHA, Props>(function RecaptchaWrapper(
  { siteKey, onChange },
  ref
) {
  if (!siteKey) return null;
  return <ReCAPTCHA ref={ref} sitekey={siteKey} onChange={onChange} />;
});
