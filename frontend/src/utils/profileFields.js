import {
  AtSign,
  Briefcase,
  Building2,
  CalendarDays,
  Hash,
  Home,
  Landmark,
  Phone,
  UserRound,
} from 'lucide-react'

// The page, the rail, the save bar and the validation all read this one list, so a
// detail the institute starts asking for is a single entry here rather than a change
// in four places that have to be kept in step with each other.

// The rules the server enforces, repeated here so a wrong value is caught under the
// row it was typed in rather than after a round trip that throws the whole form back
// with one message. The server stays the authority — this only saves a trip.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const ALTERNATE_PHONE_PATTERN = /^\d{10,15}$/
const PINCODE_PATTERN = /^\d{4,10}$/
const EARLIEST_BIRTH_YEAR = 1900

export const PROFILE_SECTIONS = [
  {
    id: 'contact',
    title: 'Contact details',
    hint: 'Another way to reach you when your phone does not answer.',
    fields: [
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        Icon: AtSign,
        placeholder: 'you@example.com',
        autoComplete: 'email',
        maxLength: 120,
        hint: 'Something that looks like you@example.com',
        validate: (value) => (EMAIL_PATTERN.test(value) ? '' : 'Enter a valid email address'),
      },
      {
        name: 'alternatePhone',
        label: 'Alternate phone',
        type: 'tel',
        Icon: Phone,
        placeholder: '9876543210',
        autoComplete: 'tel',
        inputMode: 'numeric',
        digitsOnly: true,
        maxLength: 15,
        hint: 'Digits only, 10 to 15 of them',
        validate: (value) => (
          ALTERNATE_PHONE_PATTERN.test(value) ? '' : 'Alternate phone must be 10 to 15 digits'
        ),
      },
    ],
  },
  {
    id: 'about',
    title: 'About you',
    hint: 'Used for your records at the institute.',
    fields: [
      {
        name: 'dateOfBirth',
        label: 'Date of birth',
        type: 'date',
        Icon: CalendarDays,
        autoComplete: 'bday',
        hint: 'The day only — nothing else is asked for',
        validate: (value) => {
          const date = new Date(`${value}T00:00:00`)

          if (Number.isNaN(date.getTime())
            || date.getTime() > Date.now()
            || date.getFullYear() < EARLIEST_BIRTH_YEAR) {
            return 'Date of birth must be a real date in the past'
          }

          return ''
        },
      },
      {
        name: 'occupation',
        label: 'Occupation',
        type: 'text',
        Icon: Briefcase,
        placeholder: 'Student, working professional...',
        autoComplete: 'organization-title',
        maxLength: 80,
        hint: 'What you do when you are not in class',
      },
    ],
  },
  {
    id: 'address',
    title: 'Address',
    hint: 'Where certificates and printed material should reach you.',
    fields: [
      {
        name: 'address',
        label: 'Street address',
        component: 'textarea',
        Icon: Home,
        placeholder: 'House, street and area',
        autoComplete: 'street-address',
        maxLength: 200,
      },
      {
        name: 'city',
        label: 'City',
        type: 'text',
        Icon: Building2,
        placeholder: 'City',
        autoComplete: 'address-level2',
        maxLength: 60,
      },
      {
        name: 'state',
        label: 'State',
        type: 'text',
        Icon: Landmark,
        placeholder: 'State',
        autoComplete: 'address-level1',
        maxLength: 60,
      },
      {
        name: 'pincode',
        label: 'Pincode',
        type: 'text',
        Icon: Hash,
        placeholder: '400001',
        autoComplete: 'postal-code',
        inputMode: 'numeric',
        digitsOnly: true,
        maxLength: 10,
        hint: '4 to 10 digits',
        validate: (value) => (PINCODE_PATTERN.test(value) ? '' : 'Pincode must be 4 to 10 digits'),
      },
    ],
  },
]

// The locked half of the page: what the institute holds and only an admin can move.
// It is listed the same way the editable rows are, so the page reads as one list of
// what is known about an account rather than as two unrelated halves.
export const ACCOUNT_ROWS = [
  { key: 'name', label: 'Name', Icon: UserRound },
  { key: 'phone', label: 'Phone number', Icon: Phone },
  { key: 'memberId', label: 'Member ID', Icon: Hash },
]

export const PROFILE_FIELDS = PROFILE_SECTIONS.flatMap(
  (section) => section.fields.map((field) => field.name),
)

const FIELDS_BY_NAME = Object.fromEntries(
  PROFILE_SECTIONS.flatMap((section) => section.fields).map((field) => [field.name, field]),
)

// Only one group is on screen at a time, so a rule broken in a group that is not
// showing has to be able to say which one to open before it can be pointed at.
const SECTION_BY_FIELD = Object.fromEntries(
  PROFILE_SECTIONS.flatMap((section) => section.fields.map((field) => [field.name, section.id])),
)

export const getField = (name) => FIELDS_BY_NAME[name]

export const getFieldSection = (name) => SECTION_BY_FIELD[name]

export const EMPTY_PROFILE = Object.fromEntries(PROFILE_FIELDS.map((field) => [field, '']))

// Only the fields this page knows about are carried, so a stored value it has no row
// for is left where it is rather than being posted back as an empty one.
export const toFormValues = (profile) => Object.fromEntries(
  PROFILE_FIELDS.map((field) => [field, profile?.[field] || '']),
)

// Every detail is volunteered, so an empty row is always correct. A rule only has
// something to say once something has actually been typed into it.
export const validateProfile = (form) => Object.fromEntries(
  PROFILE_FIELDS
    .map((name) => {
      const value = String(form[name] ?? '').trim()

      if (!value) {
        return [name, '']
      }

      return [name, FIELDS_BY_NAME[name].validate?.(value) || '']
    })
    .filter(([, message]) => message),
)

export const countFilled = (form, fields = PROFILE_FIELDS) => (
  fields.filter((name) => String(form[name] ?? '').trim()).length
)

export const getSectionProgress = (section, form) => {
  const total = section.fields.length
  const filled = countFilled(form, section.fields.map((field) => field.name))

  return {
    filled,
    total,
    complete: filled === total,
  }
}

// A closed row shows what is stored rather than what would be typed, so a date is
// read back as a date rather than as the YYYY-MM-DD its picker works in.
export const formatDisplayValue = (field, value) => {
  if (!value) {
    return ''
  }

  if (field.type !== 'date') {
    return value
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

// Shown under the date row while it is open, so a slip of a decade is obvious while
// it is still on screen rather than after an admin has printed it onto something.
export const getAge = (value) => {
  if (!value) {
    return null
  }

  const birthDate = new Date(`${value}T00:00:00`)

  if (Number.isNaN(birthDate.getTime())) {
    return null
  }

  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()
  const hasHadBirthday = today.getMonth() > birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate())

  return hasHadBirthday ? age : age - 1
}
