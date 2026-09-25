function InstructorHeader({ instructor }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <img src="/cot_ornge.svg" alt="Logo" className="w-10" />
        <h1 className="text-orange-600 font-bold text-lg">
          COT Instructor Portfolio Management System
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right text-sm">
          <p className="font-semibold text-gray-800">{instructor.fullName}</p>
          <p className="text-gray-400 text-xs">Instructor</p>
        </div>
        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(instructor.fullName)}&background=f97316&color=fff`}
          alt={instructor.fullName}
          className="w-10 h-10 rounded-full object-cover"
        />
      </div>
    </div>
  );
}

export default InstructorHeader;