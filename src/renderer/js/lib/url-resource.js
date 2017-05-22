import config from '../constants/config';

function getLulumiExtUrl(relativeUrl) {
  return `${config.lulumiPagesCustomProtocol}${relativeUrl}`;
}

const urlResource = {
  aboutUrls(url) {
    switch (url) {
      case 'about:about':
        return getLulumiExtUrl('about/#/');
      case 'about:lulumi':
        return getLulumiExtUrl('about/#/lulumi');
      case 'about:preferences':
        return getLulumiExtUrl('about/#/preferences');
      case 'about:downloads':
        return getLulumiExtUrl('about/#/downloads');
      case 'about:history':
        return getLulumiExtUrl('about/#/history');
      case 'about:extensions':
        return getLulumiExtUrl('about/#/extensions');
      case 'about:blank':
        return url;
      default:
        return getLulumiExtUrl('about/#/');
    }
  },
};

export default urlResource;
