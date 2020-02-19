# ragicle
Upload files to Amazon S3 Glacier

## TODO

### Business logic
* [x] Enforce a max file size for single file upload
* [x] Disallow uploading an empty file
* [x] Set up queue mechanism (async.queue)
* [x] Retry failed uploads
* [x] Make sure the (optional) archiveId property returned by Glacier uploads is not undefined
* [ ] Download archive
* [ ] Store uploaded archives in db
* [ ] Download notifications

### Optimizations
* [ ] Create full-file tree hash from stream instead of buffer (better for large files)
* [ ] use fs.open and pass file descriptors around for reading the file meant for upload
* [ ] Unify errors for upload strategies
* [ ] pass constructors for strategies instead of instances. e.g.:
```typescript
container.bind<inversify.interfaces.Newable<GlacierSingleUpload>>(TYPES.GlacierSingleStrategy).toConstructor<GlacierSingleUpload>(GlacierSingleUpload)
container.bind<inversify.interfaces.Newable<GlacierMultipartUpload>>(TYPES.GlacierMultipartStrategy)  .toConstructor<GlacierSingleUpload>(GlacierSingleUpload)
```
### Quality
* [x] Code Linting
* [ ] Integration tests

### Deliverable
* [ ] Set up build pipeline
* [ ] cross-compile
* [ ] publish as npm package

## Test-run
1. Configure chunk size in `src/config/Bootstrap.ts`
1. Configure file to upload in `src/app/App.ts`
1. Run `npm run build`
1. Run `node dist/app/App.js`
1. Save the archive id
1. create a job params json file that contains the archive id:
```json
{
  "Type": "archive-retrieval",
  "Description": "Optional description",
  "ArchiveId": "{{ returned archive id }}"
}
```
1. Run `glacier initiate-job --account-id - --vault-name {{ vault name }} --job-parameters file://{{ saved job param file }}`.
returns job id
1. Poll with `glacier describe-job --account-id - --vault-name {{ vault name }} --job-id {{ returned job id }}`
returns complete status
1. When complete, retrieve: `glacier get-job-output --account-id - --vault-name {{ vault name }} --job-id {{ job id }} <save location>`
