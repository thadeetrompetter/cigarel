# cigarel
A command line interface for [AWS S3 Glacier](https://aws.amazon.com/glacier/). Allows reliable file back-up at very
low cost.

## Features
* Upload files to AWS S3 Glacier

## Installation
Mac users [download](https://github.com/thadeetrompetter/cigarel/releases/latest) and unzip to a location in `PATH`.

## Usage

### Upload
```shell script
cigarel upload /some/file
```
The `upload` command will determine whether to upload the specified file in single or multipart mode depending on its
size.

## Options

### Upload behavior
* `--size, -s`: Chunk size for upload in MB. E.g.: Given a 9MB file, `cigarel upload /my/file --size 5` will upload the
file in two parts of ~5MB. The default chunk size is 1MB.
*  `--concurrency, -c`: Set how many file chunks will be processed simultaneously. E.g.:
`cigarel upload /my/file --concurrency 5` will upload up to 5 chunk in parallel, depending on the size of the file and
the chosen chunk size.
* `--vault-name, -n`: The Glacier **vault** to upload to. If no vault exists by the given name, it will be created. The
default vault name is **my-vault**
* `--region, -r`: The AWS region to interact with. Use a region by specifying its
[code](https://docs.aws.amazon.com/general/latest/gr/rande.html). E.g.: `cigarel upload /my/file --region us-west-2`

### Authentication
Cigarel will by default [let aws-sdk decide](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html) how to authenticate to your aws account. Use the following options to set credentials
explicitly.
* `--access-key-id, -a`: Access key to use for AWS authentication. Key should be authorized to call AWS S3 glacier
methods. Key length should be 20 characters. Using this option only makes sense if you also provide an **aws secret
access key**.
* `--secret-access-key, -k`: AWS secret access key to accompany the aforementioned **access key id**. This also does
not make sense to pass on its own. Length of secret access should be 40 characters.
* `--session-token, -t`: An optional session token for use with explicitly provided **access key id** and
**secret access key**.

## TODO
* Get an overview of your uploads
* Download files stored in AWS Glacier

### Future optimizations
* [ ] Create full-file tree hash from stream instead of buffer (better for large files)
* [ ] use fs.open and pass file descriptors around for reading the file meant for upload
* [ ] Unify errors for upload strategies
* [ ] Integration tests
* [ ] publish as npm package

## Test-run
1. `cigarel upload **file**`
1. Save the archive id
1. create a job params json file that contains the archive id:
```json
{
  "Type": "archive-retrieval",
  "Description": "Optional description",
  "ArchiveId": "{{ returned archive id }}"
}
```
1. Run `aws glacier initiate-job --account-id - --vault-name {{ vault name }} --job-parameters file://{{ saved job param file }}`.
returns job id
1. Poll with `aws glacier describe-job --account-id - --vault-name {{ vault name }} --job-id {{ returned job id }}`
returns complete status
1. When complete, retrieve: `aws glacier get-job-output --account-id - --vault-name {{ vault name }} --job-id {{ job id }} <save location>`
