import * as React from "react";
import { useFormContext, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "./label";
import { Input } from "./input";
import { cn } from "@/src/lib/utils";

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

const Form = ({ children, ...props }: FormProps) => {
  return <form {...props}>{children}</form>;
};

interface FormFieldProps {
  name: string;
  label?: string;
  children: (props: {
    field: {
      value: any;
      onChange: (value: any) => void;
      onBlur: () => void;
    };
    fieldState: {
      error?: { message?: string };
    };
  }) => React.ReactNode;
}

const FormField = ({ name, label, children }: FormFieldProps) => {
  const { register, formState, watch, setValue } = useFormContext();
  const value = watch(name);
  const error = formState.errors[name];

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={name}>{label}</Label>}
      {children({
        field: {
          value,
          onChange: (val) => setValue(name, val, { shouldValidate: true }),
          onBlur: () => {},
        },
        fieldState: {
          error: error as { message?: string },
        },
      })}
      {error && (
        <p className="text-sm text-red-500">
          {(error as { message?: string })?.message}
        </p>
      )}
    </div>
  );
};

const FormItem = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-2", className)} {...props} />
);

const FormLabel = Label;
const FormControl = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const FormDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);
const FormMessage = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm font-medium text-destructive", className)} {...props} />
);

export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  FormProvider,
  useForm,
};

