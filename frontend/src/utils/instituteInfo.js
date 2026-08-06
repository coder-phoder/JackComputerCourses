// Where the institute is, how to reach it and what it is called. The navbar, every
// call-to-action, the contact page and the footer all quote the same phone number and
// the same address, so all of them read it from here — a number that changes changes
// in one place.
export const INSTITUTE = {
  legalName: 'Jack Computer Infotech',
  brandFirst: 'Jack',
  brandSecond: 'Courses',
  since: 2019,
  city: 'Chandkheda, Ahmedabad',
  phoneDisplay: '99253 89893',
  phoneDial: '+919925389893',
  whatsappNumber: '919925389893',
  email: 'jackcomputerinfotech@gmail.com',
  openingHours: '9 AM – 9 PM',
  addressLines: [
    '109, Rudrax Complex,',
    'Bus Stand, IOC Road,',
    'near Chandkheda, Shantikunj Society,',
    'Chandkheda, Ahmedabad,',
    'Gujarat 382424',
  ],
  shortAddress: '109, Rudrax Complex, IOC Road, Chandkheda, Ahmedabad 382424',
  mapsUrl: 'https://maps.google.com/?q=Rudrax+Complex+IOC+Road+Chandkheda+Ahmedabad+382424',
}

// Students cannot sign themselves up (SELF_REGISTRATION_ENABLED is false), so every
// button that would have said "enrol" opens a chat instead. The message is written by
// the caller and encoded here so no caller has to remember to.
export const whatsappLink = (message) => (
  `https://wa.me/${INSTITUTE.whatsappNumber}?text=${encodeURIComponent(message)}`
)

export const telLink = `tel:${INSTITUTE.phoneDial}`

export const mailLink = `mailto:${INSTITUTE.email}`
