import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

const openapiTxtPath = path.resolve('src/Assets/openapi 3.1.0.txt');
const openapiDoc = yaml.load(fs.readFileSync(openapiTxtPath, 'utf8'));

// Load search findings and callers
const v2Mapping = JSON.parse(fs.readFileSync('scratch/swagger_frontend_mapping.json', 'utf8'));

const detailedInventory = [];

for (const [pathKey, pathItem] of Object.entries(openapiDoc.paths)) {
  for (const [method, op] of Object.entries(pathItem)) {
    if (!['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) continue;

    const mapping = v2Mapping.find(m => m.endpoint === pathKey && m.httpMethod === method.toUpperCase()) || {};

    // Module / Tag
    let moduleTag = 'Other';
    if (pathKey.startsWith('/api/method/agency_tracking.')) {
      moduleTag = pathKey.replace('/api/method/agency_tracking.', '').split('.')[0];
    } else {
      moduleTag = pathKey.replace('/api/method/', '');
    }

    // Parameters
    const params = (op.parameters || []).map(p => {
      return `${p.name}${p.required ? ' (req)' : ''}: ${p.schema?.type || 'string'}`;
    });

    // Request Body
    let reqBodyDesc = 'None';
    let reqContentType = 'None';
    if (op.requestBody) {
      const contentTypes = Object.keys(op.requestBody.content || {});
      reqContentType = contentTypes.join(', ');
      const jsonContent = op.requestBody.content?.['application/json'];
      const formContent = op.requestBody.content?.['multipart/form-data'] || op.requestBody.content?.['application/x-www-form-urlencoded'];
      
      const targetContent = jsonContent || formContent;
      if (targetContent?.schema?.properties) {
        const props = targetContent.schema.properties;
        const reqFields = targetContent.schema.required || [];
        reqBodyDesc = Object.entries(props).map(([k, v]) => {
          const isReq = reqFields.includes(k);
          return `${k}${isReq ? ' (req)' : ''}: ${v.type || 'any'}`;
        }).join(', ');
      } else if (targetContent?.schema) {
        reqBodyDesc = JSON.stringify(targetContent.schema);
      }
    }

    // Responses
    const responseCodes = Object.keys(op.responses || {});
    const resp200 = op.responses?.['200'];
    const respSchemaProps = resp200?.content?.['application/json']?.schema?.properties?.message?.properties;
    let respSchemaDesc = 'object';
    if (respSchemaProps) {
      respSchemaDesc = Object.keys(respSchemaProps).join(', ');
    } else if (resp200?.content?.['application/json']?.schema) {
      respSchemaDesc = JSON.stringify(resp200.content['application/json'].schema);
    }

    // Binary / File response?
    const isBinary = pathKey.includes('export_commissions_xlsx') || pathKey.includes('get_batch_invoice_pdf') || pathKey.includes('upload_file');

    // Authentication & Roles
    const roles = op['x-roles'] || [];
    const auth = op.security ? 'Session Cookie / API Key' : 'Public / Guest';

    // Status evaluation
    let implemented = 'NO';
    let correctlyIntegrated = 'NO';
    let status = 'NOT STARTED';
    let remainingWork = 'Implement frontend caller and UI';

    if (mapping.v2Callers && mapping.v2Callers.length > 0) {
      implemented = 'YES';
      if (mapping.pageCallers && mapping.pageCallers.length > 0) {
        correctlyIntegrated = 'YES';
        status = 'IMPLEMENTED';
        remainingWork = 'Runtime verify against live backend';
      } else if (mapping.compCallers && mapping.compCallers.length > 0) {
        correctlyIntegrated = 'PARTIAL';
        status = 'PARTIAL';
        remainingWork = 'Connect component to main page route';
      } else {
        correctlyIntegrated = 'NO';
        status = 'PARTIAL';
        remainingWork = 'Build frontend UI page/view to consume endpoint';
      }
    }

    // Special classifications
    if (pathKey.includes('api_docs.get_swagger_spec')) {
      implemented = 'NO';
      status = 'UNVERIFIED';
      remainingWork = 'Dev/Doc only endpoint';
    }

    detailedInventory.push({
      endpoint: pathKey,
      httpMethod: method.toUpperCase(),
      module: moduleTag,
      purpose: op.summary || op.description || '',
      auth,
      roles: roles.join(', ') || 'Internal Staff / Defined by Doctype',
      parameters: params.join(', ') || 'None',
      requestBody: reqBodyDesc,
      requestContentType: reqContentType,
      responseCodes: responseCodes.join(', '),
      responseSchema: respSchemaDesc,
      isBinary: isBinary ? 'YES' : 'NO',
      currentFrontendCaller: (mapping.v2Callers || []).join(', ') || 'None',
      frontendPageComp: [...(mapping.pageCallers || []), ...(mapping.compCallers || [])].join(', ') || 'None',
      implemented,
      correctlyIntegrated,
      runtimeVerified: 'UNVERIFIED',
      remainingWork,
      status
    });
  }
}

fs.writeFileSync('scratch/full_inventory_table.json', JSON.stringify(detailedInventory, null, 2));
console.log(`Detailed inventory rows created: ${detailedInventory.length}`);

// Group counts by status
const statusCounts = {};
detailedInventory.forEach(row => {
  statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
});
console.log('Status counts:', statusCounts);
