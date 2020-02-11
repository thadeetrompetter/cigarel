# ragicle
Upload files to Amazon S3 Glacier

## TODO

### Business logic
* [x] Enforce a max file size for single file upload
* [ ] Accept user-provided AWS credentials
* [x] Disallow uploading an empty file
* [ ] Set up queue mechanism (async.queue)
* [ ] Retry failed uploads
* [x] Make sure the (optional) archiveId property returned by Glacier uploads is not undefined
* [ ] Accept archive description
* [ ] New or existing Glacier vault (create if not exist)
* [ ] Download archive
* [ ] Store uploaded archives in db
* [ ] Download notifications
* [ ] Logger

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
* [ ] Create command line app
* [ ] cross-compile
* [ ] publish as npm package
