import { useState, useEffect } from 'react';
import { ActivityTimeline } from '../components/cards';
import {
  ConfirmationModal,
  DetailDrawer,
  EmptyState,
  Ghost,
  PrimaryCTA,
  SecondaryCTA,
  Tabs,
} from '../components/primitives';
import { fmtDT } from '../lib/format';
import { M, P_ } from '../lib/lifecycle';
import { orgName } from '../lib/masterData';
import { myMsgs } from '../lib/navigation';
import PERSONAS from '../data/personas.json';

/* ---------- notification & activity drawer ---------- */
export function NotificationDrawer({ db, s, cons, ctx, ccrn, onClose }) {
  const [tab, setTab] = useState(ccrn ? 'act' : 'notif');
  const [openId, setOpenId] = useState(null);
  const [note, setNote] = useState(null);
  const ext = PERSONAS[s.persona].ext;
  const msgs = myMsgs(db, s, cons);
  const c = ccrn ? db.cons[ccrn] : null;
  const acts = c
    ? c.tl.filter((t) => !ext || t.ext)
    : cons
        .flatMap((x) =>
          x.tl
            .filter((t) => !ext || t.ext)
            .map((t) => ({
              ...t,
              text: t.text,
              by: (t.by || '') + ' · ' + x.id.slice(-9),
            })),
        )
        .sort((a, b) => b.at - a.at)
        .slice(0, 30);
  useEffect(() => () => ctx.markRead(), []);
  return (
    <DetailDrawer
      title={'Notifications & activity'}
      sub={c ? c.id : orgName(s)}
      onClose={onClose}
      footer={
        <SecondaryCTA
          icon="send"
          onClick={() =>
            ctx.compose({
              ccrn: ccrn || (cons[0] && cons[0].id),
              kind: 'Send Message',
            })
          }
        >
          Send Message
        </SecondaryCTA>
      }
    >
      <Tabs
        tabs={[
          [
            'notif',
            `Notifications${msgs.filter((m) => !m.read).length ? ' (' + msgs.filter((m) => !m.read).length + ')' : ''}`,
          ],
          ['act', c ? 'Activity on this consignment' : 'Recent activity'],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'notif' ? (
        msgs.length ? (
          <ul className="lst">
            {msgs.slice(0, 40).map((m) => (
              <li
                key={m.id}
                style={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: '6px',
                }}
              >
                <div
                  className="row"
                  style={{
                    alignItems: 'flex-start',
                    flexWrap: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      marginTop: '7px',
                      flex: 'none',
                      background: m.read ? 'transparent' : 'var(--cyan)',
                    }}
                  />
                  <div
                    style={{
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <b
                      style={{
                        fontSize: '13.5px',
                        display: 'block',
                      }}
                    >
                      {m.subject}
                    </b>
                    <small className="muted">
                      {fmtDT(m.at)}
                      {' · '}
                      {m.ch}
                    </small>
                  </div>
                </div>
                {openId === m.id ? (
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontSize: '13.5px',
                      background: 'var(--surface-2)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                    }}
                    className="ink2"
                  >
                    {m.body}
                  </div>
                ) : null}
                {note === m.id ? (
                  <NoteBox
                    onSave={(t) => {
                      ctx.addNote(m.ccrn, t);
                      setNote(null);
                    }}
                    onCancel={() => setNote(null)}
                  />
                ) : null}
                <div
                  className="row"
                  style={{
                    paddingLeft: '18px',
                  }}
                >
                  <Ghost icon="eye" onClick={() => setOpenId(openId === m.id ? null : m.id)}>
                    {openId === m.id ? 'Hide message' : 'View Message'}
                  </Ghost>
                  {ext
                    ? null
                    : [
                        <Ghost
                          icon="refresh"
                          onClick={() =>
                            ctx.toast(
                              `Message resent to the ${m.to.map((x) => PERSONAS[x].label).join(', ')} channel.`,
                              'ok',
                            )
                          }
                        >
                          Resend
                        </Ghost>,
                        <Ghost icon="note" onClick={() => setNote(m.id)}>
                          Add Note
                        </Ghost>,
                      ]}
                  <span className="grow" />
                  <button
                    className="crumb mono"
                    style={{
                      fontSize: '12px',
                    }}
                    onClick={() => {
                      onClose();
                      ctx.openC(m.ccrn);
                    }}
                  >
                    {m.ccrn.slice(-9)}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="bell"
            tone="ok"
            title="You're up to date"
            text="New messages about your consignments will appear here."
          />
        )
      ) : (
        <div>
          {c && !ext
            ? [
                <div
                  style={{
                    marginBottom: '12px',
                  }}
                >
                  <Ghost icon="note" onClick={() => setNote('act')}>
                    Add Note
                  </Ghost>
                </div>,
                note === 'act' ? (
                  <NoteBox
                    onSave={(t) => {
                      ctx.addNote(c.id, t);
                      setNote(null);
                    }}
                    onCancel={() => setNote(null)}
                  />
                ) : null,
              ]
            : null}
          <ActivityTimeline items={acts} />
        </div>
      )}
    </DetailDrawer>
  );
}

export function NoteBox({ onSave, onCancel }) {
  const [t, setT] = useState('');
  return (
    <div
      className="col"
      style={{
        gap: '8px',
      }}
    >
      <textarea
        id="note-box"
        className="in"
        value={t}
        onChange={(e) => setT(e.target.value)}
        placeholder="Internal note. Visible to MMCZ users only."
      />
      <div className="row">
        <PrimaryCTA disabled={!t.trim()} onClick={() => onSave(t.trim())}>
          Save note
        </PrimaryCTA>
        <SecondaryCTA sm={1} onClick={onCancel}>
          Cancel
        </SecondaryCTA>
      </div>
    </div>
  );
}

export function Composer({ db, s, ctx, init, onClose }) {
  const c = db.cons[init.ccrn];
  const ext = PERSONAS[s.persona].ext;
  const def = {
    to: ext ? 'MMCZ Consignment Desk' : init.to || (c ? P_(c).contact + ' · ' + P_(c).short : ''),
    subject:
      init.subject ||
      (c ? `${init.kind === 'Escalate' ? 'Escalation' : init.kind === 'Notify' ? 'Update' : 'Message'} – ${c.id}` : ''),
    body: init.body || '',
  };
  const [m, setM] = useState(def);
  const up = (k, v) =>
    setM((o) => ({
      ...o,
      [k]: v,
    }));
  return (
    <ConfirmationModal
      title={init.kind || 'Send Message'}
      text={c ? `About ${c.id} · ${P_(c).short} · ${M(c).name}` : ''}
      confirm={init.kind === 'Escalate' ? 'Send escalation' : 'Send'}
      onClose={onClose}
      onConfirm={() => {
        if (!m.body.trim()) {
          ctx.toast('Write a message before sending.', 'bad');
          return;
        }
        ctx.sendMsg(init.ccrn, m, init.kind);
        onClose();
      }}
    >
      <label className="fld">
        <span className="lbl">To</span>
        <input id="cmp-to" className="in" value={m.to} onChange={(e) => up('to', e.target.value)} />
      </label>
      <label className="fld">
        <span className="lbl">Subject</span>
        <input id="cmp-subj" className="in" value={m.subject} onChange={(e) => up('subject', e.target.value)} />
      </label>
      <label className="fld">
        <span className="lbl">Message</span>
        <textarea
          id="cmp-body"
          className="in"
          style={{
            minHeight: '140px',
          }}
          value={m.body}
          onChange={(e) => up('body', e.target.value)}
          placeholder="Write your message"
        />
      </label>
      <span className="help">Sent by email and in-app, and logged on the consignment.</span>
    </ConfirmationModal>
  );
}
