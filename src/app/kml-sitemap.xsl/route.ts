import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET() {
  const xsl = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
  xmlns:html="http://www.w3.org/TR/REC-html40"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:kml="http://www.opengis.net/kml/2.2"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>KML File</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #fff;
          }
          #header {
            background-color: #4285f4;
            padding: 30px 40px;
            color: #fff;
          }
          #header h1 {
            margin: 0 0 15px 0;
            font-size: 24px;
            font-weight: 400;
          }
          #header p {
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
            color: #e8eaed;
          }
          #header a {
            color: #fff;
            text-decoration: underline;
            border-bottom: 1px dashed rgba(255,255,255,0.5);
          }
          #content {
            padding: 40px;
            max-width: 1200px;
            margin: 0 auto;
          }
          .sitemap-info {
            margin-bottom: 20px;
            font-size: 13px;
            color: #5f6368;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th {
            background-color: #4285f4;
            color: white;
            text-align: left;
            padding: 12px 15px;
            font-weight: 600;
          }
          td {
            padding: 12px 15px;
            border-bottom: 1px solid #e8eaed;
            color: #5f6368;
          }
          tr:nth-child(even) td {
            background-color: #f8f9fa;
          }
          tr:hover td {
            background-color: #f1f3f4;
          }
          a {
            color: #4285f4;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div id="header">
          <h1>KML File</h1>
          <p>
            This KML file provides location information for search engines.
            <br />
            Learn more about <a href="https://developers.google.com/kml/" target="_blank">KML File</a>.
          </p>
        </div>
        
        <div id="content">
          <div class="sitemap-info">
            This KML file contains <strong><xsl:value-of select="count(//kml:Placemark)"/></strong> Locations.
            <br/><br/>
            <a href="/sitemap_index.xml">&#8592; Sitemap Index</a>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Phone number</th>
                <th>Latitude</th>
                <th>Longitude</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="//kml:Placemark">
                <tr>
                  <td>
                    <span style="color: #4285f4;"><xsl:value-of select="kml:name"/></span>
                  </td>
                  <td>
                    <xsl:value-of select="kml:address"/>
                  </td>
                  <td>
                    <xsl:value-of select="kml:phoneNumber"/>
                  </td>
                  <td>
                    <xsl:value-of select="substring-after(kml:Point/kml:coordinates, ',')"/>
                  </td>
                  <td>
                    <xsl:value-of select="substring-before(kml:Point/kml:coordinates, ',')"/>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;

  return new NextResponse(xsl, {
    headers: {
      'Content-Type': 'text/xsl',
    },
  });
}
