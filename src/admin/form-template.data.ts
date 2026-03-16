export type TemplateFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'boolean';

export type TemplateFieldInput = {
  key: string;
  label: string;
  type: TemplateFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
};

export type CreateFormTemplateInput = {
  name?: string;
  version?: string;
  description?: string;
  categoryId?: string;
  templateCode?: string;
  fields?: TemplateFieldInput[];
};

export type FormTemplateLibraryItem = {
  code: string;
  name: string;
  version: string;
  description?: string;
  fields: TemplateFieldInput[];
};

export const FORM_TEMPLATE_LIBRARY: FormTemplateLibraryItem[] = [
  {
    code: 'supplier_onboarding_v1',
    name: 'Supplier Onboarding Form',
    version: '1.0.0',
    description: 'Default onboarding form for new suppliers',
    fields: [
      {
        key: 'businessNature',
        label: 'Nature of Business',
        type: 'text',
        required: true,
        placeholder: 'Describe your business',
      },
      {
        key: 'companyType',
        label: 'Company Type',
        type: 'select',
        required: true,
        options: ['Local', 'International', 'Joint Venture'],
      },
      {
        key: 'yearsInOperation',
        label: 'Years in Operation',
        type: 'number',
        required: true,
      },
      {
        key: 'taxCompliant',
        label: 'Tax Compliant',
        type: 'boolean',
        required: true,
      },
    ],
  },
];

export function getLibraryTemplateByCode(code?: string) {
  if (!code?.trim()) {
    return null;
  }

  const normalized = code.trim().toLowerCase();
  return (
    FORM_TEMPLATE_LIBRARY.find((item) => item.code.toLowerCase() === normalized) ||
    null
  );
}
