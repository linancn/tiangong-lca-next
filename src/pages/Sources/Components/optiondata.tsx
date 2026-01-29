import { FormattedMessage } from 'umi';

export const publicationTypeOptions = [
  {
    value: 'Undefined',
    label: (
      <FormattedMessage
        id='pages.source.view.sourceInformation.publicationType.undefined'
        defaultMessage='Undefined'
      />
    ),
  },
  {
    value: 'Article in periodical',
    label: (
      <FormattedMessage
        id='pages.source.view.sourceInformation.publicationType.articleInPeriodical'
        defaultMessage='Article in periodical'
      />
    ),
  },
  {
    value: 'Chapter in anthology',
    label: (
      <FormattedMessage
        id='pages.source.view.sourceInformation.publicationType.chapterInAnthology'
        defaultMessage='Chapter in anthology'
      />
    ),
  },
  {
    value: 'Monograph',
    label: (
      <FormattedMessage
        id='pages.source.view.sourceInformation.publicationType.monograph'
        defaultMessage='Monograph'
      />
    ),
  },
  {
    value: 'Direct measurement',
    label: (
      <FormattedMessage
        id='pages.source.view.sourceInformation.publicationType.directMeasurement'
        defaultMessage='Direct measurement'
      />
    ),
  },
  {
    value: 'Oral communication',
    label: (
      <FormattedMessage
        id='pages.source.view.sourceInformation.publicationType.oralCommunication'
        defaultMessage='Oral communication'
      />
    ),
  },
  {
    value: 'Personal written communication',
    label: (
      <FormattedMessage
        id='pages.source.view.sourceInformation.publicationType.personalWrittenCommunication'
        defaultMessage='Personal written communication'
      />
    ),
  },
  {
    value: 'Questionnaire',
    label: (
      <FormattedMessage
        id='pages.source.view.sourceInformation.publicationType.questionnaire'
        defaultMessage='Questionnaire'
      />
    ),
  },
  {
    value: 'Software or database',
    label: (
      <FormattedMessage
        id='pages.source.view.sourceInformation.publicationType.softwareOrDatabase'
        defaultMessage='Software or database'
      />
    ),
  },
  {
    value: 'Other unpublished and grey literature',
    label: (
      <FormattedMessage
        id='pages.source.view.sourceInformation.publicationType.otherUnpublishedAndGreyLiterature'
        defaultMessage='Other unpublished and grey literature'
      />
    ),
  },
];

export const getPublicationTypeLabel = (value: string) => {
  const option = publicationTypeOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
