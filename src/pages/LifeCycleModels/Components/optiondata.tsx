import { FormattedMessage } from 'umi';
export const copyrightOptions = [
  {
    value: 'Yes',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.administrativeInformation.copyright.yes'
        defaultMessage='Yes'
      />
    ),
  },
  {
    value: 'No',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.administrativeInformation.copyright.no'
        defaultMessage='No'
      />
    ),
  },
];

export const licenseTypeOptions = [
  {
    value: 'Free of charge for all users and uses',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.administrativeInformation.licenseType.freeOfChargeForAllUsersAndUses'
        defaultMessage='Free of charge for all users and uses'
      />
    ),
  },
  {
    value: 'Free of charge for some user types or use types',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.administrativeInformation.licenseType.freeOfChargeForSomeUserTypesOrUseTypes'
        defaultMessage='Free of charge for some user types or use types'
      />
    ),
  },
  {
    value: 'Free of charge for members only',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.administrativeInformation.licenseType.freeOfChargeForMembersOnly'
        defaultMessage='Free of charge for members only'
      />
    ),
  },
  {
    value: 'License fee',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.administrativeInformation.licenseType.licenseFee'
        defaultMessage='License fee'
      />
    ),
  },
  {
    value: 'Other',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.administrativeInformation.licenseType.other'
        defaultMessage='Other'
      />
    ),
  },
];
