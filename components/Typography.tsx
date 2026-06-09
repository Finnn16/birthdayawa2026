import type { ElementType, HTMLAttributes, ReactNode } from "react";
import styles from "./Typography.module.css";

type TextVariant =
  | "label"
  | "caption"
  | "body"
  | "cardTitle"
  | "sectionTitle"
  | "heroTitle";

type TextProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
};

function cx(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function TextBase({
  as,
  className,
  children,
  variant,
  ...props
}: TextProps & { variant: TextVariant }) {
  const Component = as ?? "p";

  return (
    <Component
      className={cx(styles.base, styles[variant], className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export function TextLabel(props: TextProps) {
  return <TextBase variant="label" {...props} />;
}

export function TextCaption(props: TextProps) {
  return <TextBase variant="caption" {...props} />;
}

export function TextBody(props: TextProps) {
  return <TextBase variant="body" {...props} />;
}

export function TextCardTitle(props: TextProps) {
  return <TextBase variant="cardTitle" {...props} />;
}

export function TextSectionTitle(props: TextProps) {
  return <TextBase variant="sectionTitle" {...props} />;
}

export function TextHeroTitle(props: TextProps) {
  return <TextBase variant="heroTitle" {...props} />;
}
