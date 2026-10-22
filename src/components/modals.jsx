import { useState } from 'react';
import { Icon } from './Icon';
import { ConfirmationModal } from './primitives';
import { nf } from '../lib/format';
import { M, qtyOf, refs } from '../lib/lifecycle';
import { aud, msg, tl } from '../lib/workflow';
import DOCS from '../data/documentTypes.json';

export function UploadModal({ db, ctx, id, k, onClose }) {
  const c = db.cons[id];
  const nm = DOCS.find((d) => d[0] === k)[1];
  const [file, setFile] = useState('');
  const sample =
    k === 'coo' ? `${refs(c).coo.replace(/\//g, '-')}.pdf` : `${nm.replace(/\W+/g, '_')}_${c.id.slice(-6)}.pdf`;
  return (
    <ConfirmationModal
      title={'Upload ' + nm}
      text={`${c.id} · ${M(c).name} · ${nf(qtyOf(c))} MT`}
      confirm="Upload Document"
      onClose={onClose}
      onConfirm={() => {
        if (!file) {
          ctx.toast('Choose a file to upload.', 'bad');
          return;
        }
        ctx.doUpload(id, k, file);
        onClose();
      }}
    >
      <label
        className={'upl' + (file ? ' done' : '')}
        style={{
          cursor: 'pointer',
        }}
      >
        <span className="fi">
          <Icon n={file ? 'check' : 'upload'} />
        </span>
        <div
          style={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <b>{file || 'Choose a PDF or image'}</b>
          <small>{file ? 'Ready to upload' : 'Signed certificate as issued'}</small>
        </div>
        <input
          id="up-file"
          type="file"
          hidden
          onChange={(e) => {
            const f = e.target.files[0];
            if (f) setFile(f.name);
          }}
        />
      </label>
      <button
        type="button"
        className="crumb"
        style={{
          fontSize: '13px',
          alignSelf: 'flex-start',
        }}
        onClick={() => setFile(sample)}
      >
        {'Attach from document inbox: '}
        {sample}
      </button>
    </ConfirmationModal>
  );
}

export function RespondModal({ db, ctx, id, user, mut, onClose }) {
  const c = db.cons[id];
  const [t, setT] = useState('Weighbridge tickets for Lots 13–24 attached (12 tickets, 1,584.2 MT).');
  const [f, setF] = useState('Weighbridge_tickets_Lots13-24.pdf');
  return (
    <ConfirmationModal
      title="Respond to inspection query"
      text={c.v.q_open ? `${c.v.q_open.by}: ${c.v.q_open.text}` : ''}
      confirm="Send Response"
      onClose={onClose}
      onConfirm={() => {
        mut((d) => {
          const x = d.cons[id];
          x.v.q_done = {
            at: Date.now(),
            by: user,
            text: t,
            file: f,
          };
          tl(x, Date.now(), 'Producer responded to inspection query', user, 1, 'ok');
          aud(x, Date.now(), user, 'Query answered', f);
          msg(d, x, Date.now(), ['inspector'], `Query answered – ${id}`, `${user}: ${t}`);
        });
        ctx.toast('Response sent to Tinashe Ndlovu with 1 attachment.', 'ok');
        onClose();
      }}
    >
      <label className="fld">
        <span className="lbl">Your response</span>
        <textarea id="rq-t" className="in" value={t} onChange={(e) => setT(e.target.value)} />
      </label>
      <label
        className="upl done"
        style={{
          cursor: 'pointer',
        }}
      >
        <span className="fi">
          <Icon n="file" />
        </span>
        <div
          style={{
            minWidth: 0,
          }}
        >
          <b>{f}</b>
          <small>Attachment</small>
        </div>
        <input
          type="file"
          hidden
          onChange={(e) => {
            const x = e.target.files[0];
            if (x) setF(x.name);
          }}
        />
      </label>
    </ConfirmationModal>
  );
}
