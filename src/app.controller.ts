import { Controller, Get, Query } from '@nestjs/common';
import { createReadStream } from 'fs';
import { simpleParser } from 'mailparser';
import axios from 'axios';

@Controller('/api')
export class AppController {
  constructor() {}

  @Get('/email/parse')
  async parseEmail(@Query('path') path: string) {
    const emailStream = createReadStream(path);

    const parsedEmail = await simpleParser(emailStream);

    const attachment = parsedEmail.attachments.find(
      (att) => att.contentType === 'application/json',
    );
    if (attachment) {
      return JSON.parse(attachment.content.toString('utf-8'));
    }

    const jsonLinkRegex = /https?:\/\/\S+\.json/;
    const jsonLink = parsedEmail.text.match(jsonLinkRegex);
    if (jsonLink) {
      const jsonResponse = await axios.get(jsonLink[0]);
      return jsonResponse.data;
    }

    const webpageLinkRegex = /https?:\/\/\S+/;
    const webpageLink = parsedEmail.text.match(webpageLinkRegex);
    if (webpageLink) {
      const webpageResponse = await axios.get(webpageLink[0]);
      const webpageContent = webpageResponse.data;
      const jsonLinkInWebpage = webpageContent.match(jsonLinkRegex);
      if (jsonLinkInWebpage) {
        const jsonResponse = await axios.get(jsonLinkInWebpage[0]);
        return jsonResponse.data;
      }
    }

    return { error: 'No JSON content found in the email.' };
  }
}
